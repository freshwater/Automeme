
docker build . -t t && docker run --rm --interactive --tty --mount type=bind,src="$(pwd)",dst=/workfolder t bash
