# streaming-twitter-demo

## Abstract

In this builders session you will use the natural language processing (NLP) service, Amazon Comprehend, to extract key phrases, entities, topics, and sentiment from social media posts about government agency programs such as TSA PreCheck, upcoming public transit initiatives, and the next NASA Mars rover mission. You will utilize the NLP results to estimate overall public opinion about each program.

This demo is an update based on two prevous blog posts:
 * [Build a Social Media Dashboard Using Machine Learning and BI Services](https://aws.amazon.com/blogs/machine-learning/build-a-social-media-dashboard-using-machine-learning-and-bi-services/)
 * [Build a Serverless Twitter Reader Using AWS Fargate](https://aws.amazon.com/blogs/machine-learning/build-a-serverless-twitter-reader-using-aws-fargate/)

## Overview

The demo will utilize Amazon Kinesis Firehose to ingest tweets about public sector entities of interest into a 'raw' directory within a bucket in Amazon S3 that is used as a data lake. The upload of each tweet to S3 will trigger a Lambda function that runs sentiment and entity identification analysis against the tweet, and uploads back to S3 where it is available for ad-hoc query with Amazon Athena and visualzation with Amazon QuickSight. The diagram below illustrates the data flow.

In addition to building a social media dashboard, we want to capture both the raw and enriched datasets and durably store them in a data lake. This allows data analysts to quickly and easily perform new types of analytics and machine learning on this data.

During this session you will be implementing the following:

* Leverage Amazon Kinesis Data Firehose to easily capture, prepare, and load real-time data streams into data stores, data warehouses, and data lakes. In this example, we’ll use Amazon S3.
* Trigger AWS Lambda to analyze the tweets using Amazon Translate and Amazon Comprehend, two fully managed services from AWS. With only a few lines of code, these services will allow us to translate between languages and perform natural language processing (NLP) on the tweets.
* Leverage separate Kinesis data delivery streams within Amazon Kinesis Data Firehose to write the analyzed data back to the data lake.
* Leverage Amazon Athena to query the data stored in Amazon S3.
* Build a set of dashboards using Amazon QuickSight.

## Deploying the solution

We’ve provided you with an AWS CloudFormation template that will create all the ingestion components, ***_except_*** for the Amazon S3 notification for AWS Lambda (depicted as the dotted blue line).

Click the button below to launch the CloudFormation stack. 
[![Launch Stack](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/launch.svg)](https://console.aws.amazon.com/cloudformation/home#/stacks/new?stackName=Social-Media-Analytics&templateURL=https://reinvent18-builders.s3.amazonaws.com/2019/sentiment/code/deploy.yaml)

This will launch the CloudFormation stack automatically into the us-east-1 Region.

Specify these required parameters:

|**Parameter**|**Description**|
|---|---|
|InstanceKeyName|KeyPair used to connect to a Twitter streaming instance|
|TwitterAuthAccessToken|***Twitter Account*** Access token|
|TwitterAuthAccessTokenSecret|***Twitter Account*** Access token secret|
|TwitterConsumerKey|***Twitter Account*** consumer key (API key)|
|TwitterConsumerKeySecret|***Twitter Account*** consumer secret (API secret)|

**You will need to create an app on Twitter or reference the one above**: Create a consumer key (API key), consumer secret key (API secret), access token, and access token secret and use them as parameters in the CloudFormation stack. You can create them using this [link](https://apps.twitter.com/).
Additionally, you can modify which terms and languages will be pulled from the Twitter streaming API. This lambda implementation calls Comprehend for each tweet.

In the CloudFormation console, you can acknowledge by checking the boxes to allow AWS CloudFormation to create IAM resources and resource with custom name. 
![Capabilities](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/cfn_caps.png)
The CloudFormation template uses serverless transforms. Choose Create Change Set to check the resources that the transforms add, then choose Execute.

After the CloudFormation stack is launched, wait until it is complete.

![Stack Launch](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/cfn_stack.png)

When the launch is finished, you’ll see a set of outputs that we’ll use throughout this blog post:


### Setting up S3 Notification – Call Amazon Translate/Comprehend from new Tweets

After the CloudFormation stack launch is completed, go to the outputs tab for direct links and information. Then click the LambdaFunctionConsoleURL link to launch directly into the Lambda function.

![outputs](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/cfn_outputs.png)

The Lambda function calls Amazon Translate and Amazon Comprehend to perform language translation and natural language processing (NLP) on tweets. The function uses Amazon Kinesis to write the analyzed data to Amazon S3.

Most of this has been set up already by the CloudFormation stack, although we will have you add the S3 notification so that the Lambda function is invoked when new tweets are written to S3:

1. Under Add Triggers, select the S3 trigger.
![Trigger step 1](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/lambda_trigger2.png)

2. Then configure the trigger with the new S3 bucket that CloudFormation created with the ‘raw/’ prefix. The event type should be Object Created (All).
![Trigger step 2](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/lambda_trigger3.png)

Following least privilege patterns, the IAM role that the Lambda function has been assigned only has access to the S3 bucket that the CloudFormation template created.
The following diagram shows an example:
![Lambda Diagram](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/twitter-dashboard-7.gif)

Take some time to examine the rest of the code. With a few lines of code, we can call Amazon Translate to convert between Arabic, Portuguese, Spanish, French, German, English, and many other languages.
The same is true for adding natural language processing into the application using Amazon Comprehend. Note how easily we were able to perform the sentiment analysis and entity extraction on the tweets within the Lambda function.

### Build the application

We are going to use AWS Fargate to run our serverless twitter application. The node application is used to collect the tweets from Twitter and push them into Kinesis Data Firehose. 

To run our application, we'll first need to build a Docker container. We are going to use an Amazon SageMaker Notebook that was deployed with the CloudFormation template as our development environment to build and push the contianer image. 

Navigate to the SageMaker console and find the newly created Notebook instance. Click 'Open Jupyter Lab' to open the Jupyter Lab application. 


![SageMaker Console1](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/sm_console.png)

The Notebook Instance name will begin with 'NotebookInstance-'

![SageMaker Console2](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/sm_console2.png)

In Jupyter Lab. open the config-fargate.ipynb notebook. This notebook walks through building and pushing a container to ECR using a Dockerfile. 

![Example Notebook](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/jupyterlab-screenshot.png "Jupyter Lab")

Select Run -> Run All Cells to run the notebook. This will create a new ECR repository, build the docker image, and push it to ECR. Take a look at the application code in the "SocialAnalyticsReader" folder. The output should look like the following:

![Success](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/docker_build.png)

### Create the Fargate task definition

1. Navigate to the ECS Console, then choose Repositories and select the tweetreader-repo repository that was created in the previous step. Copy the Repository URI.
2. Choose Task Definitions and then choose Create New Task Definition.

![Launch Type](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/selectfargate.png)

3. Select launch type compatibility as FARGATE and click Next Step.
4. In the create task definition screen, do the following:
    * In Task Definition Name, type tweetreader-task
    * In Task Role, choose AccessRoleForTweetReaderfromFG
    * In Task Memory, choose 2GB
    * In Task CPU, choose 1 vCPU

![Task Definition](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/task_container.png)
 
5. Choose Add Container under Container Definitions. On the Add Container page, do the following:
    * Enter Container name as tweetreader-cont
    * Enter Image URL copied from step 1
    * Enter Memory Limits as 128 and choose Add.
Note: Select TaskExecutionRole as “ecsTaskExecutionRole” if it already exists. If not, select Create new role and it will create “ecsTaskExecutionRole” for you.

![Add container](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/task_container.png)

6. Choose the Create button on the task definition screen to create the task. It will successfully create the task, execution role and Amazon CloudWatch Logs groups.

7. In the Amazon ECS console, choose Clusters and create cluster. Select template as “Networking only, Powered by AWS Fargate” and chooose the next step.

![Create Cluster 1](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/create-cluster1.png)

8. Enter cluster name as tweetreader-cluster and choose Create.

![Configure Cluster](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/create_cluster.png)

### Create an ECS cluster and start the Fargate task

1. In the Amazon ECS console, go to Task Definitions, select the tweetreader-task, choose Actions, and then choose Run Task.
On the Run Task page, for Launch Type select Fargate, for Cluster select tweetreader-cluster, select Cluster VPC and Subnets values, and then choose Run Task. Select the VPC that was created as part of the CFN stack (You can refer back to the CFN outputs tab for the identifyer if you have multiple VPCs). 

![https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/run_task.png](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/run_task.png)

2. To test the application, choose the running task in the Fargate console. Go to the logs tab and verify there is nothing there. This means the node application is running and no errors occurred.

After a few minutes, you should be able to see the various datasets in the S3 bucket that the CloudFormation template created:
**Note (If you don’t see all three prefixes)**: If you don’t see any data, check to make sure the Twitter reader is reading correctly and not creating errors. If you only see a raw prefix and not the others, check to make sure that the S3 trigger is set up on the Lambda function.

![Data](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/s3.png)

### Create the Athena tables Option 1

In the first option, we will use our SageMaker notebook to create the Athena tables. 

Go back to the SageMaker notebook and open the "athena_queryes.ipynb" notebook file. 

![Athena Notebook](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/athena-notebook1.png)
This notebook will walk you through creating and querying Amazon Athena tables against the data directly in S3.

### Create the Athena tables Option 2

We are going to manually create the Amazon Athena tables. This is a great place to leverage AWS Glue crawling features in your data lake architectures. The crawlers will automatically discover the data format and data types of your different datasets that live in Amazon S3 (as well as relational databases and data warehouses). More details can be found in the documentation for [Crawlers with AWS Glue](http://docs.aws.amazon.com/glue/latest/dg/add-crawler.html).
In Athena, run the following commands to create the Athena database and tables:

```sql
CREATE database socialanalytics;
```

This will create a new database in Athena.
Run the next statement.
**IMPORTANT**: Replace <TwitterRawLocation> with what is shown as an output of the CloudFormation script:

```sql
CREATE EXTERNAL TABLE socialanalytics.tweets (
    coordinates STRUCT<
        type: STRING,
        coordinates: ARRAY<
            DOUBLE
        >
    >,
    retweeted BOOLEAN,
    source STRING,
    entities STRUCT<
        hashtags: ARRAY<
            STRUCT<
                text: STRING,
                indices: ARRAY<
                    BIGINT
                >
            >
        >,
        urls: ARRAY<
            STRUCT<
                url: STRING,
                expanded_url: STRING,
                display_url: STRING,
                indices: ARRAY<
                    BIGINT
                >
            >
        >
    >,
    reply_count BIGINT,
    favorite_count BIGINT,
    geo STRUCT<
        type: STRING,
        coordinates: ARRAY<
            DOUBLE
        >
    >,
    id_str STRING,
    timestamp_ms BIGINT,
    truncated BOOLEAN,
    text STRING,
    retweet_count BIGINT,
    id BIGINT,
    possibly_sensitive BOOLEAN,
    filter_level STRING,
    created_at STRING,
    place STRUCT<
        id: STRING,
        url: STRING,
        place_type: STRING,
        name: STRING,
        full_name: STRING,
        country_code: STRING,
        country: STRING,
        bounding_box: STRUCT<
            type: STRING,
            coordinates: ARRAY<
                ARRAY<
                    ARRAY<
                        FLOAT
                    >
                >
            >
        >
    >,
    favorited BOOLEAN,
    lang STRING,
    in_reply_to_screen_name STRING,
    is_quote_status BOOLEAN,
    in_reply_to_user_id_str STRING,
    user STRUCT<
        id: BIGINT,
        id_str: STRING,
        name: STRING,
        screen_name: STRING,
        location: STRING,
        url: STRING,
        description: STRING,
        translator_type: STRING,
        protected: BOOLEAN,
        verified: BOOLEAN,
        followers_count: BIGINT,
        friends_count: BIGINT,
        listed_count: BIGINT,
        favourites_count: BIGINT,
        statuses_count: BIGINT,
        created_at: STRING,
        utc_offset: BIGINT,
        time_zone: STRING,
        geo_enabled: BOOLEAN,
        lang: STRING,
        contributors_enabled: BOOLEAN,
        is_translator: BOOLEAN,
        profile_background_color: STRING,
        profile_background_image_url: STRING,
        profile_background_image_url_https: STRING,
        profile_background_tile: BOOLEAN,
        profile_link_color: STRING,
        profile_sidebar_border_color: STRING,
        profile_sidebar_fill_color: STRING,
        profile_text_color: STRING,
        profile_use_background_image: BOOLEAN,
        profile_image_url: STRING,
        profile_image_url_https: STRING,
        profile_banner_url: STRING,
        default_profile: BOOLEAN,
        default_profile_image: BOOLEAN
    >,
    quote_count BIGINT
) ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION '**<TwitterRawLocation>**';
```

This will create a tweets table. Next we’ll do the same and create the entities and sentiment tables. It is important to update both of these with the actual paths listed in your CloudFormation output.
First run this command replacing the path highlighted in the following example to create the entities table:

```sql
CREATE EXTERNAL TABLE socialanalytics.tweet_entities (
    tweetid BIGINT,
    entity STRING,
    type STRING,
    score DOUBLE
) ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION '**<TwitterEntitiesLocation>**';
```

And now run this command to create the sentiments table:

```sql
CREATE EXTERNAL TABLE socialanalytics.tweet_sentiments (
    tweetid BIGINT,
    text STRING,
    originalText STRING,
    sentiment STRING,
    sentimentPosScore DOUBLE,
    sentimentNegScore DOUBLE,
    sentimentNeuScore DOUBLE,
    sentimentMixedScore DOUBLE
) ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION '**<TwitterSentimentLocation>**'
```

After running these four statements and replacing the locations for the create table statements, you should be able to select the socialanalytics database in the drop-down list and see the three tables:
You can run queries to investigate the data you are collecting. Let’s first look at the tables themselves.
We can look at a sample of 20 tweets:

```sql
SELECT * from socialanalytics.tweets limit 20;
```

Pull the top entity types:

```sql
SELECT type, count(*) cnt from socialanalytics.tweet_entities group by type order by cnt desc
```

Now we can pull the top 20 commercial items:

```sql
select entity, type, count(*) cnt from socialanalytics.tweet_entities where type = 'COMMERCIAL_ITEM' group by entity, type order by cnt desc limit 20;
```

Let’s now pull 20 positive tweets and see their scores from sentiment analysis:

```sql
select * from socialanalytics.tweet_sentiments where sentiment = 'POSITIVE' limit 20;
```

```sql
select lang, count(*) cnt from socialanalytics.tweets group by lang order by cnt desc
```

You can also start to query the translation details. Even if I don’t know the German word for shoe, I could easily do the following query:

```sql
select ts.text, ts.originaltext from socialanalytics.tweet_sentiments ts join socialanalytics.tweets t on (ts.tweetid = t.id) where lang = 'de' and ts.text like '%Shoe%'
```

The results show a tweet talking about shoes based on the translated text:
Let’s also look at the non-English tweets that have Kindle extracted through NLP:

```sql
select lang, ts.text, ts.originaltext from socialanalytics.tweet_sentiments ts join socialanalytics.tweets t on (ts.tweetid = t.id) where lang != 'en' and ts.tweetid in (select distinct tweetid from tweet_entities where entity = 'AWS')
```

**Note**: Technically you don’t have to use the fully qualified table names if the database is selected in Athena, but I did that to limit people having issues if they didn’t select the socialanalytics database first.

### Building QuickSight dashboards

1. Launch into [QuickSight](https://us-east-1.quicksight.aws.amazon.com/sn/start).
![QuickSight DB](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/quicksight-main.png)
2. Click the admin icon in the top right of the console and select "Manage QuickSight"
3. Under Security & permission, select the 'Add or remove' option for QuickSight access to AWS Services
4. Under Amazon S3, select the details link to be taken to a set of buckets that QuickSight can access
5. Make sure that QuickSight has access to the bucket created by CloudFormation where the twitter data is stored
6. Choose Manage data from the top right.
7. Choose New Data Set.
8. Create a new Athena Data Source.
![](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/quicksight-new-athena-source.png)
9. Select the socialanalytics database and the tweet_sentiments table.
![](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/quicksight-sentiment-source.png)
10. Then Choose Edit/Preview Data. 
11. Under Table, choose Switch to custom SQL tool: 
![](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/quicksoght-customsql.png)
12. Give the query a name (such as ‘SocialAnalyticsQuery’)
13. Put in this query:

```sql
SELECT  s.*, e.entity, e.type, e.score,
         t.lang as language,
         coordinates.coordinates[1] AS lon,
         coordinates.coordinates[2] AS lat,
         place.name,
         place.country,
         t.timestamp_ms / 1000 AS timestamp_in_seconds,
         regexp_replace(source,'\<.+?\>', '') AS src FROM socialanalytics.tweets t
         JOIN socialanalytics.tweet_sentiments s
    ON (s.tweetid = t.id) JOIN socialanalytics.tweet_entities e ON (e.tweetid = t.id)
```

14. Then choose Finish.
15. This saves the query and lets you see sampled data.
16. Switch the datatype for the timestamp_in_seconds to be a date: 
17. And then choose Save and Visualize.

Now you can easily start to build some dashboards.
**Note**: With the way I created the custom query, you’ll want to count the distinct tweetids as the value.
We’ll step you through creating a dashboard.

1. Start by making the first visualization in the top-left quadrant of the display. 
2. Select type, and tweetid from the field list.
3. Select the double arrow drop down next to Field Well. 
4. Move the tweetid to the value.
5. And then choose it to perform Count Distinct: 
6. Now switch it to a pie chart under visualization types.
![](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/quicksight-visual1.png)

Now let’s add another visual.

1. Choose Add (near the top left corner of the page) : Add Visual.
2. Resize it and move it next to your first pie chart. 
3. Now choose sentiment, timestamp_in_seconds.
![](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/second_visual.png)
4. Under the field wells, or the chart itself, you can zoom in/out of the time. Let’s zoom into hours 
![](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/quicksight_visual2byhour.png)
5. Suppose on the timeline, we only want to see positive/negative/mixed sentiments. The Neutral line, at least for my Twitter terms, is causing the rest not to be seen easily. 
![](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/quicksight_visual2_excluding.png)
6. Just click the Neutral line and in the box that appears choose to Exclude Neutral. 
![](https://github.com/HannahMarlowe/streaming-twitter-demo/blob/master/imgs/quicksight_visual2_excluded.png)

Let’s step through adding one more visual to this analysis to show the translated tweets:

1. Under Add, choose Add Visual.
2. Resize it to be the bottom half of the space.
3. Choose the Table View.
4. Select:
    * language
    * text
    * originalText

5. Then, on the left-side, choose Filter.
6. Create One : language.
7. Then choose Custom filter, Does not equal, and enter a value of en.

**Note**: You might need to adjust the column widths in the Table view based on your screen resolution to see the last column.
Now you can resize and see the Entities, Sentiment over time, and translated tweets.
You can build multiple dashboards, zoom in and out of them, and see the data in different ways.

## Shutting down

After you have created these resources, you can remove them by following these steps.

1. Stop the Twitter stream reader (if you still have it running).
    * CTRL-C or kill it if it’s in the background.

2. Delete the S3 bucket that the CloudFormation template created.
3. Delete the Athena tables database (socialanalytics).
    * Drop table socialanalytics.tweets.
    * Drop table socialanalytics.tweet_entities.
    * Drop table socialanaytics.tweet_sentiments.
    * Drop database socialanalytics.

4. Delete the CloudFormation stack (ensure that the S3 bucket is empty prior to deleting the stack).

## Conclusion

The entire processing, analytics, and machine learning pipeline starting with Amazon Kinesis, analyzing the data using Amazon Translate to translate tweets between languages, using Amazon Comprehend to perform sentiment analysis and QuickSight to create the dashboards was built without spinning up any servers.
We added advanced machine learning (ML) services to our flow, through some simple calls within AWS Lambda, and we built a multi-lingual analytics dashboard with Amazon QuickSight. We have also saved all the data to Amazon S3 so, if we want, we can do other analytics on the data using Amazon [EMR](https://aws.amazon.com/emr/), Amazon [SageMaker](https://aws.amazon.com/sagemaker/), Amazon [Elasticsearch](https://aws.amazon.com/elasticsearch-service/) Service, or other AWS services.
