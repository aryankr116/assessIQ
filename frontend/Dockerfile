# ---------------------------------------------------------------------------
# AssessIQ frontend image (Vite build served by nginx)
# Build from the frontend/ directory:
#   Mock demo (no backend):
#     docker build -t assessiq-frontend ./frontend
#   Real mode (talks to backend, same-origin /api proxied by nginx):
#     docker build --build-arg VITE_API_MODE=real --build-arg VITE_API_BASE_URL= -t assessiq-frontend ./frontend
# ---------------------------------------------------------------------------

# --- Stage 1: build static assets ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Default to the standalone mock build; override for real mode.
ARG VITE_API_MODE=mock
ARG VITE_API_BASE_URL=
ENV VITE_API_MODE=$VITE_API_MODE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# --- Stage 2: serve with nginx ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
