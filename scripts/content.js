function injectHuaClassmate() {
	const newIframe = document.createElement("iframe");
	newIframe.src = "https://uwclassmate.com/";
	newIframe.style.height = "500px";
	newIframe.style.width = "100%";
	const cdpCourseDetails = document.querySelector(".cdpCourseDetails");
	if (!cdpCourseDetails) {
		setTimeout(injectHuaClassmate, 1000);
	}
	cdpCourseDetails.appendChild(newIframe);
}

setTimeout(injectHuaClassmate, 1000);
