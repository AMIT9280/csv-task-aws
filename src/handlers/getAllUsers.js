const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event, context) => {
    try {
        const params = {
            TableName: process.env.CsvTaskTable
        }
        const results = await dynamodb.scan(params).promise();
        const users = results.Items;
        return {
            statusCode: 200,
            headers: {"content-type": "application/json"},
            body: JSON.stringify(users),
          };
    } catch (error) {
        console.error(error);
    }
    return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error fetching users' }),
      };
};
