
docker build . -t t && docker run --rm --mount type=bind,src="$(pwd)",dst=/workfolder t node script.js $@
