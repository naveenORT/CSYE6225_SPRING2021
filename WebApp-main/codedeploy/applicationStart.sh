#!/bin/bash

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/home/ubuntu/csye6225-cloud/webapp/cloudwatch-config.json -s
cd
cd csye6225-cloud/webapp/ 
sudo touch logs.log
sudo forever start index.js 
sudo chown ubuntu logs.log 
sudo chmod 664 logs.log 
