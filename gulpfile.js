"use strict"

const gulp = require("gulp")

const size = require("gulp-size")

gulp.task("default", ["build"])
gulp.task("build", ["build:node"])

gulp.task("build:node", () => {
	return gulp.src("./src/**/*.js")
		.pipe(size({ title: "build:node", showFiles: true }))
		.pipe(gulp.dest("dist/"))
})
