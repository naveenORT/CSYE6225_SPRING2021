#!/bin/bash
sleep 20
cd
cd csye6225-cloud/webapp/
if uid=$(forever list | grep index.js | cut -c24-27) 
then
    sudo forever stop $uid
else
    echo "index.js not running"
fi