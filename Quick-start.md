# Quick start

## Pre-requisites

- Make sure Parity is running on default settings.

- Install [Redis](https://redis.io), run `redis-server` with all default settings.

Requires Node ~7

    ```
    $ sudo n 7
    $ n use 7.10.1
    ```

## Backend

## How to run via Docker

- Build containers via docker-compose:

  ```bash
  $ docker-compose build
  # ...
  ```

- Run containers:

  ```bash
  $ docker-compose up
  # ...
  ```

### Install: backend

    ```
    $ cd backend
    $ npm i
    ```

### Start: backend

Start the backend service:

    ```
    $ npm start
    ```

Start the certifier service:

    ```
    $ cd backend
    $ npm run start:consumer
    ```

## Frontend

### Install: frontend

    ```
    $ cd frontend
    $ npm i
    ```

### Start: frontend

Start the frontend dev server:

    ```
    $ npm start
    ```

Open [http://localhost:8081](http://localhost:8081) in the browser.
