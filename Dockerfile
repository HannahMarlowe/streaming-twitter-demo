FROM amazonlinux:2017.09
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash \
        && . ~/.nvm/nvm.sh \
        && nvm install 8.10.0
ENV PATH /root/.nvm/versions/node/v8.10.0/bin:$PATH
WORKDIR /home/ec2-user
RUN mkdir twitterApp
COPY ./SocialAnalyticsReader/ /home/ec2-user/twitterApp
RUN chmod ugo+x /home/ec2-user/*
USER root
WORKDIR /home/ec2-user/twitterApp
	 ENTRYPOINT ["node","twitter_stream_producer_app.js"]