/***
Copyright 2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License").
You may not use this file except in compliance with the License.
A copy of the License is located at

http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed
on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied. See the License for the specific language governing
permissions and limitations under the License.
***/

'use strict';


var AWS = require('aws-sdk');
var config = require('./config');
var producer = require('./twitter_stream_producer');

// var kinesis = new AWS.Kinesis({region: config.kinesis.region});
var kinesis_firehose = new AWS.Firehose({apiVersion: '2015-08-04'});
// console.log(kinesis_firehose.listDeliveryStreams());

var params = {
  Name: '/twitter-reader/aws-config', /* required */
  WithDecryption: false
};

var config_from_parameter_store;
var ssm = new AWS.SSM();
var request = ssm.getParameter(params);
var promise = request.promise();

promise.then(
   function(data){
      console.log('promise then:',data.Parameter.Value);
     // global.twitter_config = data.Parameter.Value;
      producer(kinesis_firehose, data.Parameter.Value).run();
   },
   function(error){
        console.log(error);
   });
