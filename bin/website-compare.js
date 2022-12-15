#!/usr/bin/env node

"use strict";

const { resolve } = require("path");

process.title = "Website Compare";
require(resolve("../dist/compare"));
