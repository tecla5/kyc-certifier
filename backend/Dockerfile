FROM node:8.0.0

ENV APP_HOME /app
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

ENV NODE_ENV=development PATH=$APP_HOME/node_modules/.bin:$PATH

ADD . $APP_HOME

RUN npm install -q
