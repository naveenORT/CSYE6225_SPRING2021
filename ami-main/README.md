# Custom AMI Creation Using Hashicorp - Packer

## Steps to install Hashicorp-Packer
```sh
sudo apt-get install packer

```

## Bash Script to Validate & Build Custom Amazon Machine Image (AMI) 
> This script first validates the build using hashicorp packer using this command 
` packer validate -var-file="vars.json" ami.json`
  
> Once the build is validated, it proceeds with building the custom AMI with packer using this,
` packer build -var-file="vars.json" ami.json` 


```
vars.json file should look like this:
{
"AWS_ACCESS_KEY": "{{env `AWS_ACCESS_KEY`}}",
"AWS_SECRET_KEY": "{{env `AWS_SECRET_KEY`}}",
"AWS_REGION": "{{env `AMS_REGION`}}",
"source_ami": "{{env `source_ami`}}",
"AMI_USERS": "{{env `AMI_USERS`}}",
"SSH_USERNAME": "{{env `SSH_USERNAME`}}",
"SUBNET_ID": ""
}
```

### Instructions to Move Web Application into EC2 Instance
1. Create AMI using the source Ubunut AMI(AMI ID {ami-id}) with packer
2. Launching the EC2 instance from the created AMI 
3. Connect to the EC2 instance via ssh, manually configure the database (change temp password, create user and etc.)
4. Copy the webapp project using scp command 
5. Run the webapp API application
6. Open the port in the security group for incoming request
7. Use postman to test APIs from the IP address of the created EC2 instance

## Author
👤 **Naveen Rajendran**
* Github: [@naveenORT](https://github.com/naveenORT)

