async function inject(num) {
	const newIframe = document.createElement("iframe");
	let courseInfo = document.querySelector("h1");
	while (num < 20 && !courseInfo) {
		await sleep(1000);
		courseInfo = document.querySelector("h1");
	}
	if (!courseInfo) {
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

function sleep(delay) {
	return new Promise((resolve) => {
		setTimeout(resolve, delay);
	});
}

setTimeout(() => {
	inject(0);
}, 1000);
