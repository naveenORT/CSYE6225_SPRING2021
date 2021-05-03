provider "aws" {
  profile = "${var.PROFILE}"
  region  = "${var.REGION}"
}

resource "aws_vpc" "VPC" {
  cidr_block                       = "${var.VPC}"
  enable_dns_hostnames             = true
  enable_dns_support               = true
  assign_generated_ipv6_cidr_block = false
  tags = {
    Name = "${var.VPCname}"
  }
}

resource "aws_route_table" "routeTable" {
  vpc_id = aws_vpc.VPC.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = {
    Name = "${var.routetablename}"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.VPC.id
  tags = {
    Name = "${var.igwname}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "subnet1" {
  vpc_id            = aws_vpc.VPC.id
  cidr_block        = "${var.SUBNET1}"
  availability_zone = data.aws_availability_zones.available.names[0]
  tags = {
    Name = "${var.SUBNET1name}"
  }
}

resource "aws_subnet" "subnet2" {
  vpc_id            = aws_vpc.VPC.id
  cidr_block        = "${var.SUBNET2}"
  availability_zone = data.aws_availability_zones.available.names[1]
  tags = {
    Name = "${var.SUBNET2name}"
  }
}

resource "aws_subnet" "subnet3" {
  vpc_id            = aws_vpc.VPC.id
  cidr_block        = "${var.SUBNET3}"
  availability_zone = data.aws_availability_zones.available.names[2]
  tags = {
    Name = "${var.SUBNET3name}"
  }
}

resource "aws_route_table_association" "sub1" {
  subnet_id      = aws_subnet.subnet1.id
  route_table_id = aws_route_table.routeTable.id
}

resource "aws_route_table_association" "sub2" {
  subnet_id      = aws_subnet.subnet2.id
  route_table_id = aws_route_table.routeTable.id
}

resource "aws_route_table_association" "sub3" {
  subnet_id      = aws_subnet.subnet3.id
  route_table_id = aws_route_table.routeTable.id
}

resource "aws_security_group" "sgapp" {
  name        = "${var.sgnameapp}"
  vpc_id      = aws_vpc.VPC.id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    #cidr_blocks = ["0.0.0.0/0"]
    security_groups = [aws_security_group.elb.id]
  }

  # ingress {
  #   from_port   = 22
  #   to_port     = 22
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  # ingress {
  #   from_port   = 80
  #   to_port     = 80
  #   protocol    = "tcp"
  #   #cidr_blocks = ["0.0.0.0/0"]
  #   security_groups = [aws_security_group.elb.id]
  # }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
 
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

}

resource "aws_security_group" "sgdb" {

  name        = "${var.sgnamedb}"
  vpc_id      = aws_vpc.VPC.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    security_groups = [aws_security_group.sgapp.id]
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

}

data "aws_route53_zone" "zone" {
  name         = "${var.PROFILE}.${var.Domain}"
  private_zone = false
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.zone.id
  name    = "${var.PROFILE}.${var.Domain}"
  #ttl     = "60"
  type    = "A"
  #records = [aws_instance.ec2.public_ip]
  
  alias {
    name                   = "${aws_alb.loadbalancer.dns_name}"
    zone_id                = "${aws_alb.loadbalancer.zone_id}"
    evaluate_target_health = false
  }
  depends_on = [
    aws_alb.loadbalancer
  ]
}


resource "aws_s3_bucket" "s3" {
  acl = "private"
  bucket = "${var.bucketName}"
  force_destroy = true

  lifecycle_rule {
    enabled = true
    transition {
      days = 30
      storage_class = "${var.STORAGE_CLASS}"
    }
  }
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}


resource "aws_s3_bucket_public_access_block" "publicAccessBlockS3" {
  bucket = aws_s3_bucket.s3.id
  ignore_public_acls = true
}

resource "aws_db_subnet_group" "subnetGroupRDS" {
  name       = "subgrprds"
  subnet_ids = [aws_subnet.subnet1.id, aws_subnet.subnet2.id, aws_subnet.subnet3.id]
}

resource "aws_db_parameter_group" "sslpostgresql"{
  name = "pgpostgres"
  family = "postgres12"

  parameter {
    name = "rds.force_ssl"
    value = "1"
    apply_method = "immediate"
  }
}

resource "aws_db_instance" "rds" {
  engine = "${var.dbEngine}"
  engine_version = "${var.dbEngineVersion}"
  instance_class = "${var.dbInstanceClass}"
  multi_az = false
  identifier = "${var.dbIdentifier}"
  username = "${var.dbUsername}"
  password = "${var.dbPassword}"
  db_subnet_group_name = aws_db_subnet_group.subnetGroupRDS.name
  publicly_accessible = false
  name = "${var.dbName}"
  vpc_security_group_ids = [aws_security_group.sgdb.id]
  allocated_storage = "${var.dbAllocatedStorage}"
  storage_type = "${var.dbStorageType}"
  skip_final_snapshot = true
  storage_encrypted = true
  kms_key_id = aws_kms_key.rdskey.arn
  parameter_group_name = aws_db_parameter_group.sslpostgresql.name

  }

resource "aws_iam_policy" "WebAppS3" {
  name = "WebAppS3"
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
      {
          "Effect": "Allow",
          "Action": [
              "s3:PutObject",
              "s3:GetObject",
              "s3:DeleteObject",
              "s3:PutObjectAcl"
          ],
          "Resource": [
              "arn:aws:s3:::${var.bucketName}",
              "arn:aws:s3:::${var.bucketName}/*"
          ]
      }
  ]
}
EOF
}

resource "aws_iam_role" "EC2-CSYE6225" {
  name = "${var.IAMRoleName}"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
  tags = {
    name = "${var.IAMRoleName}"
  }
}

resource "aws_iam_role_policy_attachment" "attachRolePoliceEc2S3" {
  role       = "${aws_iam_role.EC2-CSYE6225.name}"
  policy_arn = aws_iam_policy.WebAppS3.arn
}

resource "aws_iam_instance_profile" "ec2Profile" {
  name = "ec2Profile"
  role = "${aws_iam_role.EC2-CSYE6225.name}"
}

data "aws_ami" "ubuntuec2" {
most_recent = true
owners = ["${var.AMIOwnerID}"]
}
/*
resource "aws_instance" "ec2" {
  ami = data.aws_ami.ubuntuec2.id
  instance_type = "${var.ec2InstanceType}"
  iam_instance_profile = aws_iam_instance_profile.ec2_codedeploy_profile.name
  disable_api_termination = false
  ebs_block_device {
    device_name = "${var.ebsDevice}"
    volume_size = "${var.ebsVolumeSize}"
    volume_type = "${var.ebsVolumeType}"
    delete_on_termination = "true"
  }
  
  vpc_security_group_ids = [aws_security_group.sgapp.id]
  subnet_id = aws_subnet.subnet1.id
  associate_public_ip_address = true
  user_data = <<-EOF
        #!/bin/bash 
        sudo apt update
        sudo apt install unzip
        mkdir -p /home/ubuntu/csye6225-cloud/webapp/
        sudo chown -R ubuntu:ubuntu home/ubuntu/csye6225-cloud
        sudo echo "PORT = ${var.PORT}" >> /home/ubuntu/csye6225-cloud/webapp/.env
        sudo echo "DB_URL = postgres://${var.dbUsername}:${aws_db_instance.rds.password}@${aws_db_instance.rds.endpoint}/${var.dbName} "  >> /home/ubuntu/csye6225-cloud/webapp/.env
        sudo echo "S3_BUCKET_NAME= ${aws_s3_bucket.s3.bucket}" >> /home/ubuntu/csye6225-cloud/webapp/.env
        cd /home/ubuntu/csye6225-cloud/webapp/ && GLOBIGNORE=*.env
        
        EOF
  key_name= "${var.ec2key}"
  tags = {
    Name = "${var.ec2Name}"
  }
  depends_on = [
    aws_s3_bucket.s3,
    aws_db_instance.rds,
    aws_iam_instance_profile.ec2Profile
  ]
}
*/
data "aws_iam_user" "githubActions" {
  user_name = "ghactions"
}

resource "aws_iam_user_policy" "GH-Upload-To-S3" {
  name = "GH-Upload-To-S3"
  user = data.aws_iam_user.githubActions.user_name

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:Get*",
                "s3:List*"
            ],
            "Resource": [
                "arn:aws:s3:::codedeploy.${var.CODE_DEPLOY_S3_BUCKET_NAME}/*"
            ]
        }
    ]
}
EOF
}

data "aws_caller_identity" "current" {}

resource "aws_iam_user_policy" "GH-Code-Deploy" {
  name = "GH-Code-Deploy"
  user = data.aws_iam_user.githubActions.user_name

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:RegisterApplicationRevision",
        "codedeploy:GetApplicationRevision"
      ],
      "Resource": [
        "arn:aws:codedeploy:${var.REGION}:${data.aws_caller_identity.current.account_id}:application:${var.CODE_DEPLOY_APPLICATION_NAME}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:CreateDeployment",
        "codedeploy:GetDeployment"
      ],
      "Resource": [
        "*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codedeploy:GetDeploymentConfig"
      ],
      "Resource": [
        "arn:aws:codedeploy:${var.REGION}:${data.aws_caller_identity.current.account_id}:deploymentconfig:CodeDeployDefault.OneAtATime",
        "arn:aws:codedeploy:${var.REGION}:${data.aws_caller_identity.current.account_id}:deploymentconfig:CodeDeployDefault.HalfAtATime",
        "arn:aws:codedeploy:${var.REGION}:${data.aws_caller_identity.current.account_id}:deploymentconfig:CodeDeployDefault.AllAtOnce"
      ]
    }
  ]
}
EOF
}

resource "aws_iam_role" "CodeDeployEC2ServiceRole" {
  name               = "CodeDeployEC2ServiceRole"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
  tags = {
    name = "CodeDeployEC2ServiceRole"
  }
}

resource "aws_iam_user_policy" "GH-Update-Lambda" {
  name = "GH-Update-Lambda"
  user = data.aws_iam_user.githubActions.user_name

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "lambda:UpdateFunctionCode",
                "lambda:GetFunction"
            ],
            "Resource": "arn:aws:lambda:*:${data.aws_caller_identity.current.account_id}:function:*"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": "lambda:ListFunctions",
            "Resource": "*"
        }
    ]
}
EOF
}

resource "aws_iam_policy" "CodeDeploy-EC2-S3" {
  name = "CodeDeploy-EC2-S3"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "s3:Get*",
                "s3:List*"
            ],
            "Effect": "Allow",
            "Resource": "arn:aws:s3:::codedeploy.${var.CODE_DEPLOY_S3_BUCKET_NAME}/*"
        
        }
    ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "CodeDeployEC2ServiceRole_CodeDeploy-EC2-S3" {
  role       = aws_iam_role.CodeDeployEC2ServiceRole.name
  policy_arn = aws_iam_policy.CodeDeploy-EC2-S3.arn
}

resource "aws_iam_role_policy_attachment" "CodeDeployEC2ServiceRole_WebAppS3" {
  role       = aws_iam_role.CodeDeployEC2ServiceRole.name
  policy_arn = aws_iam_policy.WebAppS3.arn
}

resource "aws_iam_instance_profile" "ec2_codedeploy_profile" {
  name = "ec2_codedeploy_profile"
  role = aws_iam_role.CodeDeployEC2ServiceRole.name
}

resource "aws_iam_role" "CodeDeployServiceRole" {
  name               = "CodeDeployServiceRole"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "codedeploy.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
  tags = {
    Name = "CodeDeployServiceRole"
  }
}

resource "aws_iam_role_policy_attachment" "CodeDeployServiceRole_AWSCodeDeployRole" {
  role       = aws_iam_role.CodeDeployServiceRole.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRole"
}

resource "aws_codedeploy_app" "codeDeployApp" {
  name = "${var.CODE_DEPLOY_APPLICATION_NAME}"
}

resource "aws_codedeploy_deployment_group" "cdgrp" {
  app_name               = aws_codedeploy_app.codeDeployApp.name
  deployment_group_name  = "${var.CODE_DEPLOY_GROUP_NAME}"
  service_role_arn       = aws_iam_role.CodeDeployServiceRole.arn
  deployment_config_name = "CodeDeployDefault.AllAtOnce"
  autoscaling_groups = [aws_autoscaling_group.WebServerGroup.name]

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }
  
  ec2_tag_set {
    ec2_tag_filter {
      key   = "Name"
      type  = "KEY_AND_VALUE"
      value = "${var.ec2Name}"
    }
  }
  
  load_balancer_info {
     target_group_info {
         name = aws_alb_target_group.AutoScalingTargetGroup.name
     }
  }

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "IN_PLACE"
  }

}

resource "aws_iam_role_policy_attachment" "EC2AttachCloudWatch" {
  role       =  aws_iam_role.CodeDeployEC2ServiceRole.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentAdminPolicy"
}

resource "aws_security_group" "elb" {
  name        = "elb"
  vpc_id      = aws_vpc.VPC.id

  # ingress {
  #   from_port   = 80
  #   to_port     = 80
  #   protocol    = "tcp"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # egress {
  #   from_port   = 0
  #   to_port     = 0
  #   protocol    = "-1"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }

  tags = {
    Name = "elb-sg"
  }
}

resource "aws_alb" "loadbalancer" {
  name                       = "alb"
  internal                   = false
  security_groups            = ["${aws_security_group.elb.id}"]
  subnets                    = [aws_subnet.subnet1.id,aws_subnet.subnet2.id,aws_subnet.subnet3.id]
  enable_deletion_protection = false
}

resource "aws_alb_target_group" "AutoScalingTargetGroup" {
  name     = "AutoScalingTargetGroup"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.VPC.id
  deregistration_delay = 5
  
  health_check {
                port = "3000"
                protocol = "HTTP"
                path = "/mybooks"
                healthy_threshold = 2
                unhealthy_threshold = 2
                interval = 5
                timeout = 2
                matcher = "200"
        }
}


resource "aws_lb_listener" "listener" {
  load_balancer_arn = "${aws_alb.loadbalancer.arn}"
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = "arn:aws:acm:${var.REGION}:${data.aws_caller_identity.current.account_id}:certificate/${var.SSLCertificateId}"

  default_action {
    type             = "forward"
    target_group_arn = "${aws_alb_target_group.AutoScalingTargetGroup.arn}"
  }
}


resource "aws_ebs_volume" "ebsvol" {
  availability_zone = "us-east-1a"
  size              = "${var.ebsVolumeSize}"
  type              = "${var.ebsVolumeType}"
  encrypted = true
  kms_key_id = aws_kms_key.ebskey.arn
}

resource "aws_launch_configuration" "asg_launch_config" {
  name                 = "asg_launch_config"
  image_id             = data.aws_ami.ubuntuec2.id
  instance_type        = "${var.ec2InstanceType}"
  iam_instance_profile = aws_iam_instance_profile.ec2_codedeploy_profile.name
  user_data            = <<-EOF
        #!/bin/bash 
        sudo apt update
        sudo apt install unzip
        mkdir -p /home/ubuntu/csye6225-cloud/webapp/
        sudo chown -R ubuntu:ubuntu home/ubuntu/csye6225-cloud
        sudo echo "PORT = ${var.PORT}" >> /home/ubuntu/csye6225-cloud/webapp/.env
        sudo echo "DB_URL = postgres://${var.dbUsername}:${aws_db_instance.rds.password}@${aws_db_instance.rds.endpoint}/${var.dbName} "  >> /home/ubuntu/csye6225-cloud/webapp/.env
        sudo echo "S3_BUCKET_NAME= ${aws_s3_bucket.s3.bucket}" >> /home/ubuntu/csye6225-cloud/webapp/.env
        cd /home/ubuntu/csye6225-cloud/webapp/ && GLOBIGNORE=*.env
        
        EOF
  key_name="${var.ec2key}"
  security_groups= ["${aws_security_group.sgapp.id}"]
  
  
  ebs_block_device {
    device_name = "${var.ebsDevice}"
    volume_size = var.ebsVolumeSize
    volume_type = var.ebsVolumeType
    delete_on_termination = "true"
    encrypted = true
  }
  
  root_block_device {
    encrypted = true
  }
    
  associate_public_ip_address = "true"
   depends_on = [
    aws_s3_bucket.s3,
    aws_db_instance.rds,
    aws_iam_instance_profile.ec2Profile
  ]

}

resource "aws_autoscaling_group" "WebServerGroup" {
  name = "WebServerGroup"
  launch_configuration = aws_launch_configuration.asg_launch_config.name
  vpc_zone_identifier = ["${aws_subnet.subnet1.id}","${aws_subnet.subnet2.id}","${aws_subnet.subnet3.id}"]
  min_size = 3
  max_size = 5
  desired_capacity = 3
  default_cooldown = 60
  health_check_grace_period = 200
  depends_on = [aws_launch_configuration.asg_launch_config]
  tag {
    key                 = "Name"
    value               = "${var.ec2Name}"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_attachment" "WebServerGroup_attachment_AutoScalingTargetGroup" {
  autoscaling_group_name = aws_autoscaling_group.WebServerGroup.id
  alb_target_group_arn   = aws_alb_target_group.AutoScalingTargetGroup.arn
}

resource "aws_autoscaling_policy" "ScaleUpPolicy" {
  name = "ScaleUpPolicy"
  policy_type = "SimpleScaling"
  adjustment_type = "ChangeInCapacity"
  autoscaling_group_name = aws_autoscaling_group.WebServerGroup.name
  cooldown = 60
  scaling_adjustment = 1
}

resource "aws_autoscaling_policy" "ScaleDownPolicy" {
  name = "ScaleDownPolicy"
  policy_type = "SimpleScaling"
  adjustment_type = "ChangeInCapacity"
  autoscaling_group_name = aws_autoscaling_group.WebServerGroup.name
  cooldown = 60
  scaling_adjustment = -1
}

resource "aws_cloudwatch_metric_alarm" "CPUHigh" {
  alarm_name = "ScaleUp"
  alarm_description = "Scale-up"
  metric_name = "CPUUtilization"
  namespace = "AWS/EC2"
  threshold = "5"
  comparison_operator = "GreaterThanThreshold"
  period = "60"
  evaluation_periods = "2"
  statistic = "Average"
  dimensions = {
    AutoScalingGroupName = "${aws_autoscaling_group.WebServerGroup.name}"
  }
  alarm_actions = ["${aws_autoscaling_policy.ScaleUpPolicy.arn}"]
}

resource "aws_cloudwatch_metric_alarm" "CPULow" {
  alarm_name = "ScaleDown"
  alarm_description = "Scale-down"
  metric_name = "CPUUtilization"
  namespace = "AWS/EC2"
  comparison_operator = "LessThanThreshold"
  period = "60"
  evaluation_periods = "2"
  threshold = "3"
  statistic = "Average"
  dimensions = {
    AutoScalingGroupName = "${aws_autoscaling_group.WebServerGroup.name}"
  }
  alarm_actions = ["${aws_autoscaling_policy.ScaleDownPolicy.arn}"]
}

data "archive_file" "helloworld" {
  type        = "zip"
  output_path = "payload.zip"
  source {
    content  = "//hello"
    filename = "index.js"
  }
}

resource "aws_dynamodb_table" "dynamodbTable" {
  name           = "${var.dynamoDbName}"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  ttl {
    attribute_name = "TimeToLive"
    enabled        = true
  }
  tags = {
    Name = "${var.dynamoDbName}"
  }
}

resource "aws_iam_role_policy_attachment" "LambdaServiceRoleAWSLambdaRole" {
  role       = aws_iam_role.LambdaServiceRole.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaRole"
}

resource "aws_iam_role_policy_attachment" "LambdaServiceRoleDynamoDBRole" {
  role       = aws_iam_role.LambdaServiceRole.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

resource "aws_iam_role_policy_attachment" "LambdaServiceRoleSESRole" {
  role       = aws_iam_role.LambdaServiceRole.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSESFullAccess"
}

resource "aws_iam_role_policy_attachment" "CodeDeployEC2ServiceRole_SNS" {
  role       = aws_iam_role.CodeDeployEC2ServiceRole.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSNSFullAccess"
}

resource "aws_iam_role_policy_attachment" "LambdaServiceLogs" {
  role       = aws_iam_role.LambdaServiceRole.name
  policy_arn = aws_iam_policy.LambdaLog.arn
}

resource "aws_iam_role" "LambdaServiceRole" {
  name = "LambdaServiceRole"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "LambdaLog" {
  name = "LambdaLog"

  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "logs:CreateLogGroup",
                 "logs:CreateLogStream",
                 "logs:PutLogEvents"
            ],
            "Effect": "Allow",
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
} 
EOF
}

resource "aws_lambda_function" "csye6225-spring21-lambda" {

  function_name = "csye6225-spring21-lambda"
  filename      = data.archive_file.helloworld.output_path
  role          = aws_iam_role.LambdaServiceRole.arn
  handler       = "index.handler"
  runtime       = "nodejs12.x"

  environment {
    variables = {
      domainemail = "${var.DOMAINEMAIL}"
    }
  }
}

resource "aws_sns_topic" "snstopic" {
  name = "notify"
}

resource "aws_lambda_permission" "LmbdaTrigger" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.csye6225-spring21-lambda.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.snstopic.arn
}

resource "aws_sns_topic_subscription" "SNSSubscribe" {
  topic_arn = aws_sns_topic.snstopic.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.csye6225-spring21-lambda.arn
}

resource "aws_kms_key" "rdskey" {
  description             = "KMS key for RDS"
  deletion_window_in_days = 10
}

resource "aws_kms_key" "ebskey" {
  description             = "KMS key for EBS "
  deletion_window_in_days = 10
  policy = <<EOF
  {
  "Version": "2012-10-17",
   "Statement": [
{
    "Sid": "Enable IAM User Permissions",
    "Effect": "Allow",
    "Principal": {
        "AWS": "arn:aws:iam::737949179909:root"
    },
    "Action": "kms:*",
    "Resource": "*"
},
{
   "Sid": "Allow service-linked role use of the CMK",
   "Effect": "Allow",
   "Principal": {
       "AWS": [
           "arn:aws:iam::737949179909:role/aws-service-role/autoscaling.amazonaws.com/AWSServiceRoleForAutoScaling"
       ]
   },
   "Action": [
       "kms:Encrypt",
       "kms:Decrypt",
       "kms:ReEncrypt*",
       "kms:GenerateDataKey*",
       "kms:DescribeKey"
   ],
   "Resource": "*"
},
{
   "Sid": "Allow attachment of persistent resources",
   "Effect": "Allow",
   "Principal": {
       "AWS": [
           "arn:aws:iam::737949179909:role/aws-service-role/autoscaling.amazonaws.com/AWSServiceRoleForAutoScaling"
       ]
   },
   "Action": [
       "kms:CreateGrant"
   ],
   "Resource": "*",
   "Condition": {
       "Bool": {
           "kms:GrantIsForAWSResource": true
       }
    }
}
]
}
EOF
}

resource "aws_ebs_default_kms_key" "ebsdefaultkey" {
  key_arn = aws_kms_key.ebskey.arn
}