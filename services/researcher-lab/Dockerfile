FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
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

# Welcome banner — lives OUTSIDE /home/researcher/ so it is never
# shadowed by the Docker volume mount on /home/researcher.
COPY welcome.sh /usr/local/bin/welcome.sh
RUN chmod 644 /usr/local/bin/welcome.sh

# Source the banner from /etc/bash.bashrc (system-wide, outside volume).
RUN echo '[ -f /usr/local/bin/welcome.sh ] && source /usr/local/bin/welcome.sh' >> /etc/bash.bashrc

# Entrypoint strips stale welcome lines from the volume-mounted .bashrc
# on every container start, so old banners never persist.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER researcher
WORKDIR /home/researcher

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sleep", "infinity"]
