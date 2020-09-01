
PWD_=$PWD
cd $(dirname $0)

TAG=memecatcher # $RANDOM
docker build . --tag $TAG > /dev/null && docker run --rm --mount type=bind,src="$PWD_",dst=/workfolder $TAG node scan.js $@
# docker rmi $TAG > /dev/null
