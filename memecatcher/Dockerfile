

FROM ubuntu:latest

RUN apt-get update --fix-missing

RUN apt-get install --yes curl

RUN curl -sL https://deb.nodesource.com/setup_10.x  | bash -
RUN apt-get install --yes nodejs

RUN npm install puppeteer
RUN npm install sqlite3

RUN DEBIAN_FRONTEND=noninteractive apt-get install -y gconf-service \
                    libasound2 \
                    libatk1.0-0 \
                    libatk-bridge2.0-0 \
                    libc6 \
                    libcairo2 \
                    libcups2 \
                    libdbus-1-3 \
                    libexpat1 \
                    libfontconfig1 \
                    libgcc1 \
                    libgconf-2-4 \
                    libgdk-pixbuf2.0-0 \
                    libglib2.0-0 \
                    libgtk-3-0 \
                    libnspr4 \
                    libpango-1.0-0 \
                    libpangocairo-1.0-0 \
                    libstdc++6 \
                    libx11-6 \
                    libx11-xcb1 \
                    libxcb1 \
                    libxcomposite1 \
                    libxcursor1 \
                    libxdamage1 \
                    libxext6 \
                    libxfixes3 \
                    libxi6 \
                    libxrandr2 \
                    libxrender1 \
                    libxss1 \
                    libxtst6 \
                    ca-certificates \
                    fonts-liberation \
                    libappindicator1 \
                    libnss3 \
                    lsb-release \
                    xdg-utils \
                    wget

RUN curl -LO https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt-get install --yes ./google-chrome-stable_current_amd64.deb
RUN rm google-chrome-stable_current_amd64.deb 

COPY scan.js .

RUN mkdir /workfolder

CMD ["/bin/bash", "-c", "node scan.js"]