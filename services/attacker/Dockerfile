FROM kalilinux/kali-rolling

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        nmap \
        iputils-ping \
        curl \
        wget \
        netcat-traditional \
        iproute2 \
        dnsutils \
        traceroute \
    && rm -rf /var/lib/apt/lists/*

CMD ["sleep", "infinity"]
