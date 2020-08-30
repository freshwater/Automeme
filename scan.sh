
TAG=memecatcher # $RANDOM
docker build . --tag $TAG > /dev/null && docker run --rm --mount type=bind,src="$(pwd)",dst=/workfolder $TAG node scan.js $@
# docker rmi $TAG > /dev/null
