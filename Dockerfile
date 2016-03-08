FROM python:2-onbuild

RUN apt-get update && apt-get install -y npm && \
    ln -s /usr/bin/nodejs /usr/bin/node
RUN npm install -g bower && \
    cd ./twidder/static && \
    bower install --allow-root && \
    cd ../../

EXPOSE 5000
CMD ["python", "./server.py"]
