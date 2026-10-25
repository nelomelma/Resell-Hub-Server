
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
);

const reviewerNames = [
  "Farhan Ahmed",
  "Ayesha Khan",
  "Mahin Islam",
  "Samiul Karim",
  "Nabila Rahman",
  "Rafiul Hasan",
  "Tasnim Akter",
  "Imran Hossain",
];

const reviewTemplates = {
  "Electronics": [
    "The device works well and matches the listed condition.",
    "Good performance for everyday use. Overall satisfied.",
  ],
  "Mobile Phones": [
    "The phone works smoothly and the display is in good condition.",
    "Good battery performance and camera quality for a used phone.",
  ],
  "Furniture": [
    "The furniture is sturdy and matches the description.",
    "Good condition and practical for everyday home use.",
  ],
  "Home Appliances": [
    "The appliance works properly and is easy to use.",
    "Good value for a pre-owned appliance.",
  ],
  "Sports & Outdoors": [
    "The equipment is in good condition and works as expected.",
    "Practical and useful for regular activities.",
  ],
  "Fashion": [
    "The item looks good and matches the listed condition.",
    "Comfortable and well maintained for a pre-owned item.",
  ],
  "Gaming": [
    "Everything works smoothly and the condition is good.",
    "A great second-hand option for gaming.",
  ],
  "Vehicles": [
    "The vehicle matches its description and runs well.",
    "Good overall condition for a pre-owned vehicle.",
  ],
  "Musical Instruments": [
    "The instrument works well and sounds good.",
    "Good condition and suitable for regular practice.",
  ],
  "Books": [
    "The pages are clean and the books are well maintained.",
    "A good second-hand book collection.",
  ],
  "Home & Living": [
    "The item looks nice and works as expected.",
    "Good quality and useful for the home.",
  ],
  "Tools & DIY": [
    "The tool works properly and feels reliable.",
    "Useful equipment in good working condition.",
  ],
  "Toys & Games": [
    "The set is in good condition and enjoyable to use.",
    "Good quality and matches the description.",
  ],
  "Baby & Kids": [
    "The item is clean and matches the listed condition.",
    "Practical and well maintained.",
  ],
};

async function main() {
  try {
    await client.connect();

    const db = client.db(process.env.DB_NAME || "resell_hub");
    const products = db.collection("products");
    const reviews = db.collection("reviews");

    const allProducts = await products
      .find({}, { projection: { _id: 1, title: 1, category: 1 } })
      .toArray();

    let added = 0;

    for (let index = 0; index < allProducts.length; index++) {
      const product = allProducts[index];
      const productId = product._id.toString();

      const existingCount = await reviews.countDocuments({
        productId,
      });

      const needed = Math.max(0, 2 - existingCount);

      if (needed === 0) continue;

      const templates = reviewTemplates[product.category] || [
        "The product matches the description and works as expected.",
        "Good condition and value for a second-hand purchase.",
      ];

      const newReviews = [];

      for (let i = 0; i < needed; i++) {
        const reviewNumber = existingCount + i;
        const name =
          reviewerNames[(index * 2 + reviewNumber) % reviewerNames.length];

        newReviews.push({
          productId,
          buyerId: `demo-reviewer-${index}-${reviewNumber}`,
          reviewerName: name,
          reviewerEmail: `demo-reviewer-${index}-${reviewNumber}@example.com`,
          rating: (index + reviewNumber) % 3 === 0 ? 4 : 5,
          comment: templates[reviewNumber % templates.length],
          isDemo: true,
          createdAt: new Date(
            Date.now() -
              (7 + index + reviewNumber * 5) * 24 * 60 * 60 * 1000
          ),
        });
      }

      if (newReviews.length > 0) {
        await reviews.insertMany(newReviews);
        added += newReviews.length;
        console.log(
          `Added ${newReviews.length} demo review(s): ${product.title}`
        );
      }
    }

    const totalReviews = await reviews.countDocuments();

    console.log("\n================================");
    console.log("Demo review setup completed!");
    console.log(`Products checked: ${allProducts.length}`);
    console.log(`New demo reviews: ${added}`);
    console.log(`Total reviews: ${totalReviews}`);
    console.log("================================");
  } catch (error) {
    console.error("Failed to add demo reviews:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
