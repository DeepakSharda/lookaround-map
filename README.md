**lookaround-map** is a web app for viewing Apple Look Around imagery on any platform, using reverse-engineered requests to Apple's internal API.

It also features a more detailed coverage map, showing all covered roads at all zoom levels, and the exact position of panoramas when zooming in. This layer can also be filtered and colored by various criteria.

Live at [lookmap.eu.pythonanywhere.com](https://lookmap.eu.pythonanywhere.com)!

## Setup
```sh
git clone https://github.com/sk-zk/lookaround-map.git --recursive
cd lookaround-map
pip install -r requirements.txt
npm i --global rollup
npm i
rollup -c
flask run
```

### Decoding
Since no browser natively supports the HEIC format\*, images must be converted to JPG before sending them to the client.
To do so, three options are implemented. Simply install the one you like and it will be selected automatically.

#1: By default, `pillow-heif` will be used to decode images. Supports every platform.

#2: [`pyheif`](https://github.com/carsales/pyheif) used to be faster than `pillow-heif` and is supported for this reason. Supports Linux and Mac.

#3: However, **the fastest option** (that I'm aware of) is my own [`heic2rgb`](https://github.com/sk-zk/heic2rgb/), which is noticeably faster than the previous two. Supports Linux and Windows.

\*) except for Safari, which will gain HEIC support in version 17, but since I don't have access to a Mac at the moment, I'm unable to integrate it (plus, if you're on a Mac, you can just launch Apple Maps anyway).

## TODO
- [ ] Convert and apply upright adjustment
   - Still can't solve this and I'm slowly losing my damn mind.  
     `unknown10` is the roll, with values between 0 and 8192 signifying positive roll and values between 16384 and 8193 signifying negative roll. `unknown11` is the tilt, with values above 8192 signifying positive tilt and values below 8192 signifying negative tilt. These two values are somehow not independent of one another though, so we might be looking at a vector of some sort, possibly one which also includes the heading as x.
- [ ] Render top and bottom faces of panoramas
   - Completely lost as to which projection this is
- [ ] Find a raster blue line layer if it exists, or decode the vector layer
   - No longer all that important because I've got my own now, but it would be nice as fallback and for whenever an update drops
   - Out of all the network requests that happen when you tap the Look Around button, the most likely candidate
     for containing that information is style 53 at z=15 specifically.  
   - This tile is in Apple's custom `VMP4` format. The general structure of the format [has been decoded](https://github.com/19h/vmp4-dump),
     but the actual content of the individual sections remains undeciphered. 
- [ ] Decode the depth / mesh data and use it to improve movement etc.
   - There are three types of pano data Apple Maps will request. One is `/t/<face>/<zoom>`, which returns the pano faces as HEIC, but there are two others: `/m/<zoom>` and `/mt/7`, in a custom format with the header `MCP4`. One of them probably contains the depth information I'm looking for.
- [ ] Properly convert and display elevation


## Credits
This app uses icons by [eva-icons](https://github.com/akveo/eva-icons) and [bqlqn](https://www.flaticon.com/authors/bqlqn/fill?author_id=291&type=standard).
