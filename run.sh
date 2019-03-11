#!/bin/bash

# help
# ./run.sh cluster-name vpc-name key-pair-name

# Get parameter
CLUSTER_NAME=$1
VPC_NAME=$2
KEY_PAIR_NAME=$3

# Check region
aws configure get region

# Build
npm run build -prefix ./cluster
npm run build -prefix ./nodegroup

# Initialize
cp cdk-default.json cdk.json
sed -ie "s/\"clusterStackName\": \"\"/\"clusterStackName\": \"${CLUSTER_NAME}-stack\"/g" cdk.json
sed -ie "s/\"nodeGroupStackName\": \"\"/\"nodeGroupStackName\": \"${CLUSTER_NAME}-nodegroup-stack\"/g" cdk.json
sed -ie "s/\"clusterName\": \"\"/\"clusterName\": \"${CLUSTER_NAME}\"/g" cdk.json
sed -ie "s/\"vpcName\": \"\"/\"vpcName\": \"${VPC_NAME}\"/g" cdk.json
sed -ie "s/\"keyPairName\": \"\"/\"keyPairName\": \"${KEY_PAIR_NAME}\"/g" cdk.json

# Deploy
cdk -a ./cluster/bin/cluster.js deploy --require-approval never
cdk -a ./nodegroup/bin/nodegroup.js deploy --require-approval never

# Update kubeconfig
aws eks update-kubeconfig --name ${CLUSTER_NAME}

# Adding nodes to the cluster
curl -O https://amazon-eks.s3-us-west-2.amazonaws.com/cloudformation/2018-12-10/aws-auth-cm.yaml
CDK_NODE_ROLE=$(aws cloudformation describe-stacks --stack-name ${CLUSTER_NAME}-nodegroup-stack --output text | grep -o arn:aws:iam[a-zA-Z0-9:\/\-]*)
sed -ie "s|<ARN of instance role (not instance profile)>|${CDK_NODE_ROLE}|g" aws-auth-cm.yaml
kubectl apply -f aws-auth-cm.yaml
