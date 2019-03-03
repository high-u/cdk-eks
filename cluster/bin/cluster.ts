#!/usr/bin/env node
import cdk = require('@aws-cdk/cdk');
import { CdkEksClusterStack } from '../lib/cluster-stack';

const app = new cdk.App();

const stackName = app.node.getContext('clusterStackName');
const clusterName = app.node.getContext('clusterName');
const vpcName = app.node.getContext('vpcName');
const clusterRegion = app.node.getContext('clusterRegion');
const clusterVersion = app.node.getContext('clusterVersion');
const vpcCidr = app.node.getContext('vpcCidr');
const subnetCidrMask = app.node.getContext('subnetCidrMask');
const natGateways = app.node.getContext('natGateways');
const maxAZs = app.node.getContext('maxAZs');
new CdkEksClusterStack(app, stackName, {
  clusterName,
  vpcName,
  clusterRegion,
  clusterVersion,
  vpcCidr,
  subnetCidrMask,
  natGateways,
  maxAZs
});
app.run();
