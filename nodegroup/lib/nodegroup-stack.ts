import as = require('@aws-cdk/aws-autoscaling');
import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/cdk');
import iam = require('@aws-cdk/aws-iam');

export interface NodeGroupProps extends cdk.StackProps {
  clusterName: string;
  vpcName: string;
  clusterStackName: string;
  keyPairName: string;
  maxSize: number;
  minSize: number;
  desiredCapacity: number;
  nodeAmiMap: {[region: string]: string;};
  instanceClass: string;
  instanceSize: string;
  nodeGroupStackName: string;
}

export class CdkEksNodeGroupStack extends cdk.Stack {

  constructor(scope: cdk.App, id: string, props: NodeGroupProps) {
    super(scope, id, props);
    
    // get existing vpc
    const provider = new ec2.VpcNetworkProvider(this, {
      vpcName: `${props.clusterStackName}/${props.vpcName}`
    });
    const vpc = ec2.VpcNetwork.import(this, props.vpcName, provider.vpcProps);
    
    // create auto-scaling-group
    const amiMap: {[region: string]: string;} = props.nodeAmiMap;
    const instanceClass: ec2.InstanceClass = <ec2.InstanceClass>props.instanceClass;
    const instanceSize: ec2.InstanceSize = <ec2.InstanceSize>props.instanceSize;
    const autoScalingGroupId = 'cdkEksAutoScalingGroup';
    const asg = new as.AutoScalingGroup(this, autoScalingGroupId, {
      instanceType: new ec2.InstanceTypePair(instanceClass, instanceSize),
      machineImage: new ec2.GenericLinuxImage(amiMap),
      vpc,
      allowAllOutbound: true,
      minSize: props.minSize,
      maxSize: props.maxSize,
      desiredCapacity: props.desiredCapacity,
      vpcPlacement: {subnetsToUse: ec2.SubnetType.Public},
      updateType: as.UpdateType.RollingUpdate,
      rollingUpdateConfiguration: {
        maxBatchSize: 1,
        minInstancesInService: 1,
        pauseTimeSec: 300,
        waitOnResourceSignals: true,
      },
      keyName: props.keyPairName !== '' ? props.keyPairName : undefined
    });
    
    // add user-data
    const BootstrapArguments = '';
    asg.addUserData(`set -o xtrace
az=\`curl -s 169.254.169.254/latest/meta-data/placement/availability-zone\`
region=\${az%[a-z]}
/etc/eks/bootstrap.sh ${props.clusterName} ${BootstrapArguments}
/opt/aws/bin/cfn-signal --exit-code $? --stack ${props.nodeGroupStackName} --resource ${autoScalingGroupId} --region $region
instance_id=\`curl -s 169.254.169.254/latest/meta-data/instance-id\`
aws ec2 create-tags --resources $instance_id --region $region --tags Key=kubernetes.io/cluster/${props.clusterName},Value=owned`)
    asg.connections.allowInternally(new ec2.AllTraffic());
    asg.connections.allowFromAnyIPv4(new ec2.TcpPort(22));
    asg.connections.allowFromAnyIPv4(new ec2.TcpPort(443));
    asg.connections.allowFromAnyIPv4(new ec2.TcpPortRange(1025, 65535));

    // add policy for create-tag
    const CreateTagsPolicy = new iam.PolicyStatement(iam.PolicyStatementEffect.Allow);
    CreateTagsPolicy.addActions("ec2:CreateTags", 'ec2:RunInstances');
    CreateTagsPolicy.addResource('*');
    asg.addToRolePolicy(CreateTagsPolicy);
    
    // add policy for worker-node
    asg.role.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy');
    asg.role.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy');
    asg.role.attachManagedPolicy('arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly');
    
    // cloudformation output
    new cdk.Output(this, 'NodeInstanceRole', { value: asg.role.roleArn });
  }
}
