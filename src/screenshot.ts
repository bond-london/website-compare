import commandLineArgs, { OptionDefinition } from "command-line-args";
import commandLineUsage from "command-line-usage";
import { exit } from "process";
import { crawlSite, defaultOptions, Options } from "./crawler";

export function doScreenshot() {
  const optionDefinitions: OptionDefinition[] = [
    { name: "urls", type: String, multiple: true },
    { name: "output", type: String },
    {
      name: "allImages",
      type: Boolean,
      defaultValue: defaultOptions.allImages,
    },
    {
      name: "totalPages",
      type: Number,
      defaultValue: defaultOptions.totalPages,
    },
    { name: "width", type: Number, defaultValue: defaultOptions.width },
    { name: "hasTouch", type: Boolean, defaultValue: defaultOptions.hasTouch },
    { name: "height", type: Number, defaultValue: defaultOptions.height },
    {
      name: "deviceScaleFactor",
      type: Number,
      defaultValue: defaultOptions.deviceScaleFactor,
    },
    {
      name: "isLandscape",
      type: Boolean,
      defaultValue: defaultOptions.isLandscape,
    },
    { name: "isMobile", type: Boolean, defaultValue: defaultOptions.isMobile },
  ];

  const options = commandLineArgs(optionDefinitions) as Partial<Options>;
  if (!options.urls || options.urls.length === 0 || !options.output) {
    const usage = commandLineUsage([
      {
        header: "Options",
        optionList: optionDefinitions,
      },
    ]);
    console.log(usage);
    exit(-1);
  }
  crawlSite(options as Options)
    .then(() => {
      console.log("Compelted ok");
    })
    .catch((error) => {
      console.error("Failed", error);
    });
}

doScreenshot();
