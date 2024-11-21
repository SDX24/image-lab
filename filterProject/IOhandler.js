const PNG = require("pngjs").PNG;
const path = require("path");
const yauzl = require('yauzl-promise'),
fs = require('fs'),
{pipeline} = require('stream/promises');


/**
 * Description: decompress file from given pathIn, write to given pathOut
 *
 * @param {string} pathIn
 * @param {string} pathOut
 * @return {promise}
 */
const unzip = async (pathIn, pathOut) => {
	const zip = await yauzl.open(pathIn);
	try {
		await fs.promises.mkdir(pathOut, { recursive: true });
		for await (const entry of zip) {
			const outputPath = path.join(pathOut, entry.filename);
			if (entry.filename.endsWith("/")) {
				await fs.promises.mkdir(outputPath, { recursive: true });
				continue;
			}
			const readStream = await entry.openReadStream();
			const writeStream = fs.createWriteStream(outputPath);
			await pipeline(readStream, writeStream);
    }
    await console.log('Extraction operation complete');
	} finally {
		await zip.close();
	}
};

/**
 * Description: read all the png files from given directory and return Promise containing array of each png file path
 *
 * @param {string} path
 * @return {promise}
 */
const readDir = async (dir) => {
  const pathArray = [];
  try {
    const files = await fs.promises.readdir(dir, { withFileTypes: true });
    files.forEach((file) => {
      if (file.isFile() && file.name.endsWith('.png')) {
        pathArray.push(path.join(dir, file.name));
      }
    });
    return pathArray;
  } catch (err) {
    console.log(err);
  }
};

/**
 * Description: Read in png file by given pathIn,
 * convert to grayscale and write to given pathOut
 *
 * @param {string} filePath
 * @param {string} pathProcessed
 * @return {promise}
 */
const grayScale = async (pathIn, pathOut) => {
  try {
    const pathArray = await readDir(pathIn);
    await Promise.all(pathArray.map(async (pngPath) => {
      const outputFilePath = `${pathOut}/${path.basename(pngPath)}`;
      await fs.promises.mkdir(pathOut, { recursive: true });  // Ensure the output directory exists
      console.log(`Processing: ${pngPath}, Output: ${outputFilePath}`);

      return new Promise((resolve, reject) => {
        fs.createReadStream(pngPath)
          .pipe(new PNG({ filterType: 4 }))
          .on('parsed', function () {
            for (let y = 0; y < this.height; y++) {
              for (let x = 0; x < this.width; x++) {
                const idx = (this.width * y + x) << 2;
                const red = this.data[idx];
                const green = this.data[idx + 1];
                const blue = this.data[idx + 2];
                const gray = Math.round((red + green + blue) / 3);
                this.data[idx] = gray;
                this.data[idx + 1] = gray;
                this.data[idx + 2] = gray;
              }
            }
            this.pack().pipe(fs.createWriteStream(outputFilePath))
              .on('finish', resolve)
              .on('error', reject);
          })
          .on('error', reject);
      });
    }));
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  unzip,
  readDir,
  grayScale,
};
