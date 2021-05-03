Terraform
=========

### Dependencies
Install the AWS CLI on Linux [https://docs.aws.amazon.com/cli/latest/userguide/install-linux.html]
and configure AWS CLI to your profile

## Install Terraform
> Install the Terraform Using this command
```sh
apt install terraform 
```
## Navigate to Infrastructure Directory

Navigate to Terraform Template Location @ `cd Cloud\Infrastructure`

Then proceed with following commands to create VPC Resources using Terraform 


## Running Instructions
To Initialize aws plugins:
`terraform init`

To create a module using terraform run the script:
`terraform apply`

Provide the required fields to create a module and build the infrastructure

To teardown the infrastructure:
`terraform destroy`

Provide the name of the module to destroy


## Security: Adding Certificates to AWS Certificate  

>To add SSL certificate in AWS Environment use this command to import certifcate from provider,

```sh
aws acm import-certificate --certificate fileb://Certificate.pem \
    --certificate-chain fileb://CertificateChain.pem \
    --private-key fileb://PrivateKey.pem 	
```

## Author
👤 **Naveen Rajendran**
* Github: [@naveenORT](https://github.com/naveenORT)

All done
