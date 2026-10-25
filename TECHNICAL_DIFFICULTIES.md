# Technical Difficulties

The hardest technical difficulties came from the fact that health data and local AI interact with phones at a low level, and from my goal of supporting both Android and iOS.

I built the app with React Native so that both Android and iOS users could use it, but pulling health data from Apple HealthKit and Android Health Connect requires native Swift and Java code. I didn't know Swift and knew only a little Java, so learning them and implementing the data pull was quite difficult. Each platform also reports data differently: HealthKit hides read authorization, Health Connect can double-count steps and calories from multiple apps, and sleep and heart-rate data needed normalizing before the scores could trust it.

Another major challenge was the AI coach. First, the app needed to check the user's phone to determine which AI model would be compatible with it, watching RAM, storage, and actual generation speed so it could step down to a smaller model instead of crashing. Then I needed to build a harness around the model that allows it to run commands, such as logging food or pulling data so it can answer questions. I also had to build safeguards and a document system containing health information to reduce hallucinations, since small on-device models are prone to confidently wrong answers.

A third challenge was food logging. I used huge databases of foods and food barcodes, and fitting them onto a phone at a reasonable size required converting the database format and implementing a fast retrieval system. The app ships 326,759 foods and 313,256 barcodes in a 112 MB file, searched offline with SQLite full-text search and a fallback for platforms where that isn't available.

Together, these three areas took most of the engineering effort: native code, device-aware local inference, and fast offline data at phone scale.
