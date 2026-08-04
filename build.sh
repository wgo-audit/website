#!/usr/bin/env bash

#------------------------------------------------------------------------------
# Builds the WGO (Whats.Going.On.) Hugo site for hosting on a Cloudflare Worker.
#
# Cloudflare Workers Builds installs Node.js dependencies automatically before
# running this script. On Linux x86_64 CI it also downloads a pinned Hugo and
# Node so builds are reproducible; on other platforms it uses local tools.
#------------------------------------------------------------------------------

set -euo pipefail

build_temp_dir=""

cleanup() {
  if [[ -n "${build_temp_dir:-}" && -d "${build_temp_dir}" ]]; then
    rm -rf "${build_temp_dir}"
  fi
}
trap cleanup EXIT SIGINT SIGTERM

main() {
  HUGO_VERSION=0.160.1
  NODE_VERSION=24.14.1
  OS_NAME="$(uname -s)"
  OS_ARCH="$(uname -m)"

  export TZ=America/Toronto

  if [[ "${OS_NAME}" == "Linux" && "${OS_ARCH}" == "x86_64" ]]; then
    build_temp_dir=$(mktemp -d)
    pushd "${build_temp_dir}" > /dev/null
    mkdir -p "${HOME}/.local"

    echo "Installing Hugo ${HUGO_VERSION}..."
    curl -sLJO "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz"
    mkdir -p "${HOME}/.local/hugo"
    tar -C "${HOME}/.local/hugo" -xf "hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz"
    export PATH="${HOME}/.local/hugo:${PATH}"

    echo "Installing Node.js ${NODE_VERSION}..."
    curl -sLJO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
    tar -C "${HOME}/.local" -xf "node-v${NODE_VERSION}-linux-x64.tar.xz"
    export PATH="${HOME}/.local/node-v${NODE_VERSION}-linux-x64/bin:${PATH}"

    popd > /dev/null
  else
    echo "Using local build tools on ${OS_NAME}/${OS_ARCH}; pinned downloads run on Linux x86_64 CI."
  fi

  echo "Verifying installations..."
  echo "Hugo: $(hugo version)"
  echo "Node.js: $(node --version)"

  # Hugo's css.TailwindCSS pipeline invokes @tailwindcss/cli from node_modules.
  # Cloudflare installs the Node deps automatically, but run npm ci if they're
  # missing so local `./build.sh` works too.
  if [[ ! -d node_modules ]]; then
    echo "Installing Node dependencies..."
    npm ci
  fi

  echo "Configuring Git..."
  git config core.quotepath false || true
  if [ "$(git rev-parse --is-shallow-repository 2>/dev/null || echo false)" = "true" ]; then
    git fetch --unshallow || true
  fi

  echo "Building the main site..."
  hugo build --config hugo.yml --gc --minify

  # Top-level /404.html fallback for URLs with no language prefix. Cloudflare's
  # not_found_handling walks up the tree; /en/404.html handles /en/* misses and
  # this copy handles root-level misses (e.g. /typo).
  echo "Copying default-language 404 to site root..."
  cp public/en/404.html public/404.html

  # Brand site (brand.wgo-audit.com) — built into the shared asset bucket under
  # /brand, where the Worker routes the brand host (see src/worker.mjs).
  echo "Building the brand site..."
  hugo build --config hugo.brand.yml --destination public/brand --gc --minify
  # The brand build emits public/brand/404.html at the brand root already;
  # the Worker rewrites brand-host misses to /brand/* so that 404 is served.
}

main "$@"
