# Variables
$IMAGE_NAME = "alyxfranck/pdf-worker"
$TAG = "latest"

# Step 1: Build the Docker image
Write-Host "Building the Docker image..."
docker build -t "${IMAGE_NAME}:${TAG}" .

# Step 2: Log in to Docker Hub
Write-Host "Logging in to Docker Hub..."
docker login

# Step 3: Push the Docker image to Docker Hub
Write-Host "Pushing the Docker image to Docker Hub..."
docker push "${IMAGE_NAME}:${TAG}"

Write-Host "Docker image pushed successfully!"