function inject() {
	const newIframe = document.createElement("iframe");
	const courseInfo = document.querySelector("h1");
	if (!courseInfo) {
		setTimeout(inject, 1000);
		return;
	}
	const courseName = courseInfo.textContent.split(" ").slice(0, 2);
	const courseNum = courseName.join("");
	newIframe.src = "https://uwclassmate.com/CourseDetail/" + courseNum;
	newIframe.style.height = "500px";
	newIframe.style.width = "100%";
	const cdpCourseDetails = document.querySelector(".cdpCourseDetails");
	cdpCourseDetails.appendChild(newIframe);
}

setTimeout(inject, 1000);
