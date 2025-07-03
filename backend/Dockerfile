FROM python:3.13-slim

ENV PYTHONPATH="${PYTHONPATH}:/"
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update && apt-get -y install libpq-dev gcc python3-distutils
RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
