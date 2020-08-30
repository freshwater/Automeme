
TAG=memecatcher # $RANDOM
docker build . --tag $TAG && docker run --rm --interactive --tty --mount type=bind,src="$(pwd)",dst=/workfolder $TAG bash
# docker rmi $TAG
