#!/usr/bin/env node

"use strict";

process.title = "Website Screenshot";
const { doScreenshot } = require("../dist/screenshot");
doScreenshot();
