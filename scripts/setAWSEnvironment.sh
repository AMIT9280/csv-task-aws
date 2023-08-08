#!/usr/bin/env sh
echo '*********************************************'
echo 'creating ~/.aws'
mkdir -p ~/.aws
echo 'preparing ~/.aws/credentials'
printf "[default]\naws_access_key_id=%s\naws_secret_access_key=%s\nregion=ap-south-1" "$AWS_ACCESS_KEY_ID" "$AWS_SECRET_ACCESS_KEY" > ~/.aws/credentials
echo '*********************************************'
cat ~/.aws/credentials