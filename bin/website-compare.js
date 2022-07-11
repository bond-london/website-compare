#!/usr/bin/env node

"use strict";

process.title = "Website Compare";
const { doCompare } = require("../dist/compare");
doCompare();
