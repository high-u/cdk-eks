import cdk = require('@aws-cdk/cdk');
import ec2 = require('@aws-cdk/aws-ec2');
import eks = require('@aws-cdk/aws-eks');
import iam = require('@aws-cdk/aws-iam');

export interface ClusterProps extends cdk.StackProps {
  clusterName: string;
  vpcName: string;
  clusterRegion: string;
  clusterVersion: string;
  vpcCidr: string;
  subnetCidrMask: number;
  natGateways: number;
  maxAZs: number;
}

export class CdkEksClusterStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: ClusterProps) {
    super(scope, id, props);

    // create vpc
    const vpc = new ec2.VpcNetwork(this, props.vpcName, {
      cidr: props.vpcCidr,
      maxAZs: props.maxAZs,
      natGateways: props.natGateways,
      subnetConfiguration: [
        {
          cidrMask: props.subnetCidrMask,
          name: 'Public',
          subnetType: ec2.SubnetType.Public,
        },
        // {
        //   cidrMask: 24,
        //   name: 'Private',
        //   subnetType: ec2.SubnetType.Private,
        // }
      ],
    });

    // create security-group for eks-cluster
    const sg = new ec2.SecurityGroup(this, 'cdkEksNodeSecurityGroup', {
      vpc,
      description: 'for EKS Node Group',
      groupName: 'cdkEksNodeSecurityGroup',
      allowAllOutbound: true
    });
    sg.addIngressRule(new ec2.AnyIPv4(), new ec2.TcpPort(22), 'allow ssh access from the world');
    sg.addIngressRule(new ec2.AnyIPv4(), new ec2.TcpPort(443), 'allow https access from the world');
    sg.addIngressRule(new ec2.AnyIPv4(), new ec2.TcpPortRange(1025, 65535), 'allow 1025-65535 access from the world');

    // create role
    const eksRole = new iam.Role(this, 'cdkEksServiceRole', {
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEKSServicePolicy",
        "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
      ]
    });
    eksRole.addToPolicy(
      new iam.PolicyStatement().
        addAction("elasticloadbalancing:*").
        addAction("ec2:CreateSecurityGroup").
        addAction("ec2:Describe*").
        addAllResources()
    );
    
    // create eks-cluster
    new eks.CfnCluster(this, 'cdkEksCluster', {
      resourcesVpcConfig: {
        securityGroupIds: [sg.securityGroupId],
        subnetIds: ((): string[] => {
          let subnets: string[] = [];
          vpc.publicSubnets.forEach(subnet => {
            subnets.push(subnet.subnetId);
          });
          return subnets;
        })()
      },
      roleArn: eksRole.roleArn,
      name: props.clusterName,
      version: props.clusterVersion
    });

    // cloudformation output
    new cdk.Output(this, 'vpcid', { value: vpc.vpcId });
    vpc.publicSubnets.forEach((subnet, index) => {
      new cdk.Output(this, `publicsubnetid${index + 1}`, { value: subnet.subnetId });
    });
    new cdk.Output(this, 'rolearn', { value: eksRole.roleArn });
    new cdk.Output(this, 'securitygroupid', { value: sg.securityGroupId });
  }
}
