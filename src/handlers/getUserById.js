const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event, context) => {
    try {
        const { id } = event.pathParameters;
        const params = {
          TableName: process.env.CsvTaskTable,
          Key: {
            uuid: id,
          },
        };
        const data = await dynamodb.get(params).promise();
        const user = data.Item;
    
        if (!user) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: 'User not found' }),
          };
        }
    
        return {
          statusCode: 200,
          body: JSON.stringify(user),
        };
      } catch (error) {
        console.error('Error fetching user by ID:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Error fetching user by ID' }),
        };
      }
};
