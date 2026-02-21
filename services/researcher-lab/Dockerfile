FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    hydra \
    nikto \
    netcat-openbsd \
    tcpdump \
    curl \
    wget \
    python3 \
    python3-pip \
    git \
    vim \
    nano \
    jq \
    dnsutils \
    iputils-ping \
    iproute2 \
    traceroute \
    whois \
    bash-completion \
    && rm -rf /var/lib/apt/lists/*

# Create researcher user
RUN useradd -m -u 1000 -s /bin/bash researcher

# Welcome message
RUN echo '\n\
echo ""\n\
echo "=== CityShield Research Lab ==="\n\
echo ""\n\
echo "You are connected to the CityShield network."\n\
echo "Available targets:"\n\
echo "  opensearch        :9200  - Data store"\n\
echo "  cityshield_backend:8000  - Backend API"\n\
echo "  traffic_sim       :8001  - Traffic simulator"\n\
echo "  iot_sim           :8002  - IoT simulator"\n\
echo "  network_emulator  :8003  - Network emulator"\n\
echo ""\n\
echo "Installed tools: nmap, hydra, nikto, netcat, tcpdump, curl, wget, python3"\n\
echo ""\n' >> /home/researcher/.bashrc

USER researcher
WORKDIR /home/researcher

CMD ["sleep", "infinity"]
