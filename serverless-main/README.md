## Technology used for deploying serverless code 

Lambda with Node.js, Express, and PostgreSQL


## Deploy Instructions
The github actions automatically updates the code in lambda. 
1. Create your Infrastructure by running terraform apply which will build your VPC, Auto Scaling groups and ALB and IAM Roles.
2. Add github secrets in private repo for GH-Actions to run the CI/CD pipeline
3. The code gets deployed into AWS lambda service


## Running 
The Webapp '/mybooks/book-id' end point will publish a sns notification and it is subscribed by lambda.
After that lambda gets trigerred by incoming sns request
The lambda sends the email using the AWS SES service 

## CI/CD
Any code commit will trigger a gh-actions build which will store the revision in lambda S3 bucket and update the Lambda function zip.
To run the CI/CD pipeline through gh-actions:
1.) Commit the code to the organization repo - it will automatically deploy the lambda code tou your AWS resource mentioned via github secrets
2.) Manual trigger for an existing code could be accomplished by running the workflow via "re-run jobs" present in the gh-actions console 


