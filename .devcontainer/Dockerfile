FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bullseye

# Install additional tools for React development
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
  && apt-get -y install --no-install-recommends \
  git \
  curl \
  && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install global npm packages for React development
RUN npm install -g \
  create-react-app \
  serve \
  prettier \
  eslint

# Set working directory
WORKDIR /workspace

# Keep container running
CMD ["sleep", "infinity"]
