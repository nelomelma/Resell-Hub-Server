import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

dotenv.config();

const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
);

try {
  await client.connect();

  const db = client.db(process.env.DB_NAME || "resell_hub");

  console.log("Connected to MongoDB...");
  console.log("Resetting ReSell Hub demo data...");

  // =========================================================
  // RESET DEMO COLLECTIONS
  // =========================================================

  await Promise.all(
    [
      "users",
      "products",
      "orders",
      "reviews",
      "payments",
      "wishlists",
    ].map((name) => db.collection(name).deleteMany({}))
  );

  // =========================================================
  // COMMON VALUES
  // =========================================================

  const password = await bcrypt.hash("123456", 10);
  const now = new Date();

  const daysAgo = (days) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // =========================================================
  // USERS
  // =========================================================

  const usersResult = await db.collection("users").insertMany([
    {
      name: "Md. Rakib Hasan",
      email: "buyer@resellhub.com",
      password,
      role: "buyer",
      status: "active",
      location: "Dhaka, Bangladesh",
      profileImage: "",
      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 5,
        12
      ),
    },

    {
      name: "Nusrat Jahan",
      email: "seller@resellhub.com",
      password,
      role: "seller",
      status: "active",
      location: "Dhaka, Bangladesh",
      profileImage: "",
      sellerRating: 4.8,
      verifiedSeller: true,
      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 5,
        18
      ),
    },

    {
      name: "Tanvir Ahmed",
      email: "tanvir@resellhub.com",
      password,
      role: "seller",
      status: "active",
      location: "Chattogram, Bangladesh",
      profileImage: "",
      sellerRating: 4.6,
      verifiedSeller: true,
      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 4,
        10
      ),
    },

    {
      name: "Sadia Rahman",
      email: "sadia@resellhub.com",
      password,
      role: "seller",
      status: "active",
      location: "Dhaka, Bangladesh",
      profileImage: "",
      sellerRating: 4.7,
      verifiedSeller: false,
      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        5
      ),
    },

    {
      name: "Arif Hossain",
      email: "arif@resellhub.com",
      password,
      role: "seller",
      status: "active",
      location: "Sylhet, Bangladesh",
      profileImage: "",
      sellerRating: 4.9,
      verifiedSeller: true,
      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        20
      ),
    },

    {
      name: "ReSell Admin",
      email: "admin@resellhub.com",
      password,
      role: "admin",
      status: "active",
      location: "Dubai, UAE",
      profileImage: "",
      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 6,
        5
      ),
    },
  ]);

  // =========================================================
  // USER IDS
  // =========================================================

  const buyerId = usersResult.insertedIds[0].toString();

  const nusratId = usersResult.insertedIds[1].toString();
  const tanvirId = usersResult.insertedIds[2].toString();
  const sadiaId = usersResult.insertedIds[3].toString();
  const arifId = usersResult.insertedIds[4].toString();

  // =========================================================
  // SELLER INFORMATION
  // =========================================================

  const sellers = {
    nusrat: {
      userId: nusratId,
      name: "Nusrat Jahan",
      email: "seller@resellhub.com",
      rating: 4.8,
      verified: true,
    },

    tanvir: {
      userId: tanvirId,
      name: "Tanvir Ahmed",
      email: "tanvir@resellhub.com",
      rating: 4.6,
      verified: true,
    },

    sadia: {
      userId: sadiaId,
      name: "Sadia Rahman",
      email: "sadia@resellhub.com",
      rating: 4.7,
      verified: false,
    },

    arif: {
      userId: arifId,
      name: "Arif Hossain",
      email: "arif@resellhub.com",
      rating: 4.9,
      verified: true,
    },
  };

  // =========================================================
  // PRODUCTS
  //
  // Images must be inside:
  // client/public/products/
  // =========================================================

  const products = [
    {
      title: "Dell Inspiron 15 Laptop",
      category: "Electronics",
      condition: "Good",
      price: 350,
      stock: 2,
      image: "/products/dell-inspiron.jpg",
      description:
        "Well-maintained Dell Inspiron 15 laptop suitable for university work, office tasks, browsing and everyday use. Fully functional and carefully used.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 2,
    },

    {
      title: "Sony WH-1000XM4 Headphones",
      category: "Electronics",
      condition: "Like New",
      price: 155,
      stock: 3,
      image: "/products/sony-xm4.jpg",
      description:
        "Sony WH-1000XM4 wireless noise-cancelling headphones in excellent condition. Comfortable fit, strong battery life and clear sound quality.",
      seller: sellers.tanvir,
      location: "Chattogram, Bangladesh",
      daysOld: 4,
    },

    {
      title: "Canon EOS 2000D Camera",
      category: "Electronics",
      condition: "Good",
      price: 310,
      stock: 1,
      image: "/products/canon-camera.jpg",
      description:
        "Canon EOS 2000D DSLR camera in good working condition. Ideal for beginners, travel photography and content creation.",
      seller: sellers.arif,
      location: "Sylhet, Bangladesh",
      daysOld: 6,
    },

    {
      title: "Samsung 27-inch Monitor",
      category: "Electronics",
      condition: "Like New",
      price: 135,
      stock: 2,
      image: "/products/samsung-monitor.jpg",
      description:
        "Samsung 27-inch monitor with a clean display and slim design. Suitable for study, office work, entertainment and home setups.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 8,
    },

    {
      title: "Samsung Galaxy S22",
      category: "Mobile Phones",
      condition: "Like New",
      price: 420,
      stock: 3,
      image: "/products/samsung-s22.jpg",
      description:
        "Samsung Galaxy S22 in excellent condition with a bright display, smooth performance and reliable camera system. Carefully used and fully functional.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 1,
    },

    {
      title: "Apple iPhone 13 128GB",
      category: "Mobile Phones",
      condition: "Good",
      price: 520,
      stock: 2,
      image: "/products/iphone-13.jpg",
      description:
        "Apple iPhone 13 128GB in good condition. Smooth performance, excellent cameras and strong battery performance for everyday use.",
      seller: sellers.arif,
      location: "Sylhet, Bangladesh",
      daysOld: 3,
    },

    {
      title: "Google Pixel 7",
      category: "Mobile Phones",
      condition: "Like New",
      price: 390,
      stock: 2,
      image: "/products/pixel-7.jpg",
      description:
        "Google Pixel 7 in excellent condition with a clean Android experience, excellent camera quality and smooth everyday performance.",
      seller: sellers.tanvir,
      location: "Chattogram, Bangladesh",
      daysOld: 5,
    },

    {
      title: "OnePlus 10 Pro",
      category: "Mobile Phones",
      condition: "Good",
      price: 360,
      stock: 1,
      image: "/products/oneplus-10-pro.jpg",
      description:
        "OnePlus 10 Pro with fast performance, vibrant display and fast charging. Device is fully functional with normal signs of use.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 9,
    },

    {
      title: "Modern Study Desk",
      category: "Furniture",
      condition: "Good",
      price: 65,
      stock: 2,
      image: "/products/study-desk.jpg",
      description:
        "Minimal modern study desk with a sturdy work surface. Suitable for a home office, student room or compact workspace.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 7,
    },

    {
      title: "Ergonomic Office Chair",
      category: "Furniture",
      condition: "Like New",
      price: 85,
      stock: 2,
      image: "/products/office-chair.jpg",
      description:
        "Comfortable ergonomic office chair with adjustable height and supportive backrest. Ideal for long study or working sessions.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 10,
    },

    {
      title: "Wooden Bookshelf",
      category: "Furniture",
      condition: "Good",
      price: 55,
      stock: 1,
      image: "/products/bookshelf.jpg",
      description:
        "Strong wooden bookshelf with multiple storage shelves. Clean condition and suitable for books, decor and home organization.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 12,
    },

    {
      title: "Comfortable 3-Seater Sofa",
      category: "Furniture",
      condition: "Good",
      price: 120,
      stock: 1,
      image: "/products/sofa.jpg",
      description:
        "Comfortable three-seater sofa in good used condition. Clean and well maintained with minor signs of normal use.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 6,
    },

    {
      title: "Yamaha FZ-S Motorcycle",
      category: "Vehicles",
      condition: "Good",
      price: 1450,
      stock: 1,
      image: "/products/yamaha-fz.jpg",
      description:
        "Yamaha FZ-S motorcycle in good running condition. Regularly maintained and suitable for daily commuting.",
      seller: sellers.tanvir,
      location: "Chattogram, Bangladesh",
      daysOld: 11,
    },

    {
      title: "Honda CB Hornet 160R",
      category: "Vehicles",
      condition: "Good",
      price: 1650,
      stock: 1,
      image: "/products/honda-hornet.jpg",
      description:
        "Honda CB Hornet 160R with reliable performance and comfortable handling. Maintained regularly and ready for everyday use.",
      seller: sellers.arif,
      location: "Sylhet, Bangladesh",
      daysOld: 16,
    },

    {
      title: "Levi's Denim Jacket",
      category: "Fashion",
      condition: "Like New",
      price: 32,
      stock: 2,
      image: "/products/denim-jacket.jpg",
      description:
        "Classic denim jacket in excellent condition. Comfortable casual wear with a timeless everyday look.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 13,
    },

    {
      title: "Leather Shoulder Bag",
      category: "Fashion",
      condition: "Good",
      price: 42,
      stock: 1,
      image: "/products/leather-bag.jpg",
      description:
        "Elegant leather shoulder bag with practical compartments and a clean design. Gently used and well maintained.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 17,
    },

    {
      title: "Nike Running Shoes",
      category: "Fashion",
      condition: "Like New",
      price: 58,
      stock: 1,
      image: "/products/nike-shoes.jpg",
      description:
        "Comfortable Nike running shoes in very good condition. Lightweight design suitable for walking, running and everyday wear.",
      seller: sellers.tanvir,
      location: "Chattogram, Bangladesh",
      daysOld: 18,
    },

    {
      title: "PlayStation 5",
      category: "Gaming",
      condition: "Like New",
      price: 480,
      stock: 1,
      image: "/products/ps5.jpg",
      description:
        "PlayStation 5 console in excellent condition with smooth performance. Ideal for modern console gaming and entertainment.",
      seller: sellers.arif,
      location: "Sylhet, Bangladesh",
      daysOld: 15,
    },

    {
      title: "Nintendo Switch",
      category: "Gaming",
      condition: "Good",
      price: 220,
      stock: 2,
      image: "/products/nintendo-switch.jpg",
      description:
        "Nintendo Switch console in good condition. Portable and versatile gaming system suitable for handheld and TV play.",
      seller: sellers.tanvir,
      location: "Chattogram, Bangladesh",
      daysOld: 19,
    },

    {
      title: "Philips Coffee Maker",
      category: "Home Appliances",
      condition: "Like New",
      price: 45,
      stock: 2,
      image: "/products/coffee-maker.jpg",
      description:
        "Compact Philips coffee maker in excellent condition. Easy to use and ideal for preparing fresh coffee at home or in the office.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 20,
    },

    {
      title: "LG 7KG Front Load Washing Machine",
      category: "Home Appliances",
      condition: "Good",
      price: 180,
      stock: 1,
      image: "/products/washing-machine.jpg",
      description:
        "LG 7KG front-load washing machine in good used condition. Fully functional, clean and well maintained.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 4,
    },

    {
      title: "Panasonic 20L Microwave Oven",
      category: "Home Appliances",
      condition: "Like New",
      price: 55,
      stock: 1,
      image: "/products/microwave-oven.jpg",
      description:
        "Panasonic 20L microwave oven in excellent used condition. Clean, compact and fully functional.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 8,
    },

    {
      title: "Apple Watch Series 7",
      category: "Electronics",
      condition: "Good",
      price: 145,
      stock: 1,
      image: "/products/apple-watch.jpg",
      description:
        "Apple Watch Series 7 in good used condition. Display and controls work properly with normal signs of use.",
      seller: sellers.arif,
      location: "Sylhet, Bangladesh",
      daysOld: 5,
    },

    {
      title: "Trek Mountain Bike",
      category: "Sports & Outdoors",
      condition: "Good",
      price: 190,
      stock: 1,
      image: "/products/mountain-bike.jpg",
      description:
        "Trek mountain bike in good condition with reliable brakes and smooth gear shifting. Suitable for recreation and commuting.",
      seller: sellers.tanvir,
      location: "Chattogram, Bangladesh",
      daysOld: 9,
    },

    {
      title: "Adidas Football Boots",
      category: "Sports & Outdoors",
      condition: "Like New",
      price: 45,
      stock: 1,
      image: "/products/football-boots.jpg",
      description:
        "Adidas football boots in excellent condition with clean studs and comfortable fit. Lightly used.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 11,
    },

    {
      title: "Yamaha Acoustic Guitar",
      category: "Musical Instruments",
      condition: "Good",
      price: 120,
      stock: 1,
      image: "/products/acoustic-guitar.jpg",
      description:
        "Yamaha acoustic guitar in good used condition with a clean body and comfortable playability.",
      seller: sellers.arif,
      location: "Sylhet, Bangladesh",
      daysOld: 9,
    },

    {
      title: "Harry Potter Complete Book Set",
      category: "Books",
      condition: "Like New",
      price: 40,
      stock: 1,
      image: "/products/harry-potter-books.jpg",
      description:
        "Complete Harry Potter book collection in very good condition. Pages are clean with minimal signs of use.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 13,
    },

    {
      title: "Casio Digital Piano Keyboard",
      category: "Musical Instruments",
      condition: "Good",
      price: 150,
      stock: 1,
      image: "/products/casio-keyboard.jpg",
      description:
        "Casio electronic keyboard in good working condition. Suitable for beginners, students and home practice.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 14,
    },

    {
      title: "Dyson V8 Cordless Vacuum Cleaner",
      category: "Home Appliances",
      condition: "Good",
      price: 130,
      stock: 1,
      image: "/products/dyson-vacuum.jpg",
      description:
        "Dyson cordless vacuum cleaner in good working condition. Clean, lightweight and convenient for everyday cleaning.",
      seller: sellers.tanvir,
      location: "Chattogram, Bangladesh",
      daysOld: 16,
    },

    {
      title: "Modern Floor Lamp",
      category: "Home & Living",
      condition: "Like New",
      price: 30,
      stock: 2,
      image: "/products/floor-lamp.jpg",
      description:
        "Modern floor lamp in excellent condition. Suitable for bedrooms, living rooms and reading corners.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 7,
    },

    {
      title: "Apple iPad 9th Generation",
      category: "Electronics",
      condition: "Like New",
      price: 260,
      stock: 1,
      image: "/products/ipad-9th-gen.jpg",
      description:
        "Apple iPad 9th Generation in excellent condition. Fully functional and well maintained with minimal signs of use.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 3,
    },

    {
      title: "Ninja Air Fryer 4L",
      category: "Home Appliances",
      condition: "Like New",
      price: 75,
      stock: 1,
      image: "/products/ninja-air-fryer.jpg",
      description:
        "Ninja air fryer in excellent used condition. Clean, fully functional and ideal for everyday cooking.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 5,
    },

    {
      title: "Bosch Cordless Drill Set",
      category: "Tools & DIY",
      condition: "Good",
      price: 65,
      stock: 1,
      image: "/products/bosch-drill.jpg",
      description:
        "Bosch cordless drill set in good working condition with carrying case and useful accessories.",
      seller: sellers.tanvir,
      location: "Chattogram, Bangladesh",
      daysOld: 10,
    },

    {
      title: "Decathlon 4-Person Camping Tent",
      category: "Sports & Outdoors",
      condition: "Good",
      price: 80,
      stock: 1,
      image: "/products/camping-tent.jpg",
      description:
        "Four-person camping tent in good used condition. Clean, practical and suitable for family camping trips.",
      seller: sellers.arif,
      location: "Sylhet, Bangladesh",
      daysOld: 12,
    },

    {
      title: "Adjustable Dumbbell Set",
      category: "Sports & Outdoors",
      condition: "Good",
      price: 70,
      stock: 1,
      image: "/products/dumbbell-set.jpg",
      description:
        "Pair of adjustable dumbbells in good condition. Ideal for strength training and compact home-gym setups.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 6,
    },

    {
      title: "LEGO Classic Building Set",
      category: "Toys & Games",
      condition: "Like New",
      price: 35,
      stock: 1,
      image: "/products/lego-set.jpg",
      description:
        "LEGO Classic building set in very good condition with colorful building pieces and storage box.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 8,
    },

    {
      title: "Baby Stroller",
      category: "Baby & Kids",
      condition: "Good",
      price: 85,
      stock: 1,
      image: "/products/baby-stroller.jpg",
      description:
        "Foldable baby stroller in good used condition with canopy, safety harness and convenient storage space.",
      seller: sellers.nusrat,
      location: "Dhaka, Bangladesh",
      daysOld: 11,
    },

    {
      title: "Canon PIXMA Wireless Printer",
      category: "Electronics",
      condition: "Good",
      price: 60,
      stock: 1,
      image: "/products/canon-printer.jpg",
      description:
        "Canon PIXMA wireless printer in good working condition. Suitable for home, study and small-office printing.",
      seller: sellers.tanvir,
      location: "Chattogram, Bangladesh",
      daysOld: 14,
    },

    {
      title: "Bedside Table",
      category: "Furniture",
      condition: "Like New",
      price: 40,
      stock: 1,
      image: "/products/bedside-table.jpg",
      description:
        "Compact bedside table in excellent condition with a convenient drawer and useful storage space.",
      seller: sellers.sadia,
      location: "Dhaka, Bangladesh",
      daysOld: 15,
    },
  ];

  // =========================================================
  // CREATE PRODUCT DOCUMENTS
  // =========================================================

  const productDocs = products.map((product) => ({
    title: product.title,
    category: product.category,
    condition: product.condition,

    price: Number(product.price),
    stock: Number(product.stock),

    images: [product.image],

    description: product.description,

    sellerId: product.seller.userId,

    sellerInfo: {
      userId: product.seller.userId,
      name: product.seller.name,
      email: product.seller.email,
      rating: product.seller.rating,
      verified: product.seller.verified,
    },

    location: product.location,

    status: product.stock > 0 ? "available" : "sold",

    moderationStatus: "approved",

    createdAt: daysAgo(product.daysOld),
    updatedAt: daysAgo(product.daysOld),
  }));

  const productResult = await db
    .collection("products")
    .insertMany(productDocs);

  const productIds = Object.values(productResult.insertedIds);

  // =========================================================
  // REVIEWS
  // =========================================================

  await db.collection("reviews").insertMany([
    {
      productId: productIds[4].toString(),
      buyerId,
      reviewerName: "Md. Rakib Hasan",
      reviewerEmail: "buyer@resellhub.com",
      rating: 5,
      comment:
        "The phone was exactly as described and in excellent condition.",
      createdAt: daysAgo(8),
    },

    {
      productId: productIds[4].toString(),
      buyerId: "demo-reviewer-1",
      reviewerName: "Farhan Ahmed",
      reviewerEmail: "farhan@example.com",
      rating: 4,
      comment:
        "Very good condition and smooth performance. Happy with the purchase.",
      createdAt: daysAgo(15),
    },

    {
      productId: productIds[1].toString(),
      buyerId,
      reviewerName: "Md. Rakib Hasan",
      reviewerEmail: "buyer@resellhub.com",
      rating: 5,
      comment:
        "Excellent sound quality and the noise cancellation works really well.",
      createdAt: daysAgo(12),
    },

    {
      productId: productIds[5].toString(),
      buyerId: "demo-reviewer-2",
      reviewerName: "Ayesha Khan",
      reviewerEmail: "ayesha@example.com",
      rating: 5,
      comment:
        "The phone arrived in very good condition and works perfectly.",
      createdAt: daysAgo(17),
    },

    {
      productId: productIds[8].toString(),
      buyerId: "demo-reviewer-3",
      reviewerName: "Mahin Islam",
      reviewerEmail: "mahin@example.com",
      rating: 4,
      comment:
        "The desk is sturdy and looks clean. Good value for the price.",
      createdAt: daysAgo(20),
    },

    {
      productId: productIds[17].toString(),
      buyerId: "demo-reviewer-4",
      reviewerName: "Samiul Karim",
      reviewerEmail: "samiul@example.com",
      rating: 5,
      comment:
        "Console condition was excellent and everything worked as expected.",
      createdAt: daysAgo(21),
    },
  ]);

  // =========================================================
  // SAMPLE ORDERS
  // =========================================================

  const orderResult = await db.collection("orders").insertMany([
    {
      productId: productIds[4].toString(),

      productTitle: "Samsung Galaxy S22",

      productInfo: {
        productId: productIds[4].toString(),
        title: "Samsung Galaxy S22",
        image: "/products/samsung-s22.jpg",
        category: "Mobile Phones",
        condition: "Like New",
      },

      buyerInfo: {
        userId: buyerId,
        name: "Md. Rakib Hasan",
        email: "buyer@resellhub.com",
      },

      sellerInfo: {
        userId: nusratId,
        name: "Nusrat Jahan",
        email: "seller@resellhub.com",
      },

      quantity: 1,
      price: 420,
      totalAmount: 420,
      currency: "usd",

      orderStatus: "delivered",
      paymentStatus: "paid",
      paymentMethod: "stripe",

      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        18
      ),

      updatedAt: new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        22
      ),
    },

    {
      productId: productIds[1].toString(),

      productTitle: "Sony WH-1000XM4 Headphones",

      productInfo: {
        productId: productIds[1].toString(),
        title: "Sony WH-1000XM4 Headphones",
        image: "/products/sony-xm4.jpg",
        category: "Electronics",
        condition: "Like New",
      },

      buyerInfo: {
        userId: buyerId,
        name: "Md. Rakib Hasan",
        email: "buyer@resellhub.com",
      },

      sellerInfo: {
        userId: tanvirId,
        name: "Tanvir Ahmed",
        email: "tanvir@resellhub.com",
      },

      quantity: 1,
      price: 155,
      totalAmount: 155,
      currency: "usd",

      orderStatus: "shipped",
      paymentStatus: "paid",
      paymentMethod: "stripe",

      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        20
      ),

      updatedAt: new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        22
      ),
    },

    {
      productId: productIds[8].toString(),

      productTitle: "Modern Study Desk",

      productInfo: {
        productId: productIds[8].toString(),
        title: "Modern Study Desk",
        image: "/products/study-desk.jpg",
        category: "Furniture",
        condition: "Good",
      },

      buyerInfo: {
        userId: buyerId,
        name: "Md. Rakib Hasan",
        email: "buyer@resellhub.com",
      },

      sellerInfo: {
        userId: sadiaId,
        name: "Sadia Rahman",
        email: "sadia@resellhub.com",
      },

      quantity: 1,
      price: 65,
      totalAmount: 65,
      currency: "usd",

      orderStatus: "processing",
      paymentStatus: "paid",
      paymentMethod: "stripe",

      createdAt: daysAgo(5),
      updatedAt: daysAgo(4),
    },

    {
      productId: productIds[19].toString(),

      productTitle: "Philips Coffee Maker",

      productInfo: {
        productId: productIds[19].toString(),
        title: "Philips Coffee Maker",
        image: "/products/coffee-maker.jpg",
        category: "Home Appliances",
        condition: "Like New",
      },

      buyerInfo: {
        userId: buyerId,
        name: "Md. Rakib Hasan",
        email: "buyer@resellhub.com",
      },

      sellerInfo: {
        userId: nusratId,
        name: "Nusrat Jahan",
        email: "seller@resellhub.com",
      },

      quantity: 1,
      price: 45,
      totalAmount: 45,
      currency: "usd",

      orderStatus: "pending",
      paymentStatus: "pending",

      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ]);

  // =========================================================
  // SAMPLE PAYMENT HISTORY
  //
  // These are demo payment records.
  // Real Stripe payments will continue to be created by
  // the actual payment API.
  // =========================================================

  const orderIds = Object.values(orderResult.insertedIds);

  await db.collection("payments").insertMany([
    {
      transactionId: "demo_pi_samsung_s22_001",
      paymentIntentId: "demo_pi_samsung_s22_001",

      buyerId,
      buyerName: "Md. Rakib Hasan",
      buyerEmail: "buyer@resellhub.com",

      orderId: orderIds[0].toString(),

      productId: productIds[4].toString(),
      productName: "Samsung Galaxy S22",

      amount: 420,
      currency: "usd",

      paymentStatus: "paid",
      status: "paid",

      paymentMethod: "stripe",

      paymentDate: new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        18
      ),

      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        18
      ),
    },

    {
      transactionId: "demo_pi_sony_xm4_002",
      paymentIntentId: "demo_pi_sony_xm4_002",

      buyerId,
      buyerName: "Md. Rakib Hasan",
      buyerEmail: "buyer@resellhub.com",

      orderId: orderIds[1].toString(),

      productId: productIds[1].toString(),
      productName: "Sony WH-1000XM4 Headphones",

      amount: 155,
      currency: "usd",

      paymentStatus: "paid",
      status: "paid",

      paymentMethod: "stripe",

      paymentDate: new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        20
      ),

      createdAt: new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        20
      ),
    },

    {
      transactionId: "demo_pi_study_desk_003",
      paymentIntentId: "demo_pi_study_desk_003",

      buyerId,
      buyerName: "Md. Rakib Hasan",
      buyerEmail: "buyer@resellhub.com",

      orderId: orderIds[2].toString(),

      productId: productIds[8].toString(),
      productName: "Modern Study Desk",

      amount: 65,
      currency: "usd",

      paymentStatus: "paid",
      status: "paid",

      paymentMethod: "stripe",

      paymentDate: daysAgo(5),
      createdAt: daysAgo(5),
    },
  ]);

  // =========================================================
  // INDEXES
  // =========================================================

  await db
    .collection("users")
    .createIndex({ email: 1 }, { unique: true });

  await db.collection("products").createIndex({
    title: "text",
    category: "text",
    description: "text",
  });

  await db.collection("products").createIndex({
    category: 1,
    price: 1,
  });

  await db.collection("products").createIndex({
    sellerId: 1,
  });

  await db.collection("orders").createIndex({
    "buyerInfo.userId": 1,
  });

  await db.collection("orders").createIndex({
    "sellerInfo.userId": 1,
  });

  await db.collection("reviews").createIndex({
    productId: 1,
    createdAt: -1,
  });

  await db.collection("payments").createIndex({
    buyerId: 1,
    paymentDate: -1,
  });

  // =========================================================
  // FINISHED
  // =========================================================

  console.log("");
  console.log("==========================================");
  console.log(" ReSell Hub professional seed completed!");
  console.log("==========================================");
  console.log("");
  console.log("Users:     6");
  console.log(`Products:  ${products.length}`);
  console.log("Sellers:   4");
  console.log("Buyer:     1");
  console.log("Admin:     1");
  console.log("Orders:    4");
  console.log("Reviews:   6");
  console.log("Payments:  3");
  console.log("");
  console.log("Demo password for all accounts: 123456");
  console.log("");
  console.log("Buyer:");
  console.log("buyer@resellhub.com / 123456");
  console.log("");
  console.log("Seller:");
  console.log("seller@resellhub.com / 123456");
  console.log("");
  console.log("Admin:");
  console.log("admin@resellhub.com / 123456");
  console.log("");
  console.log("IMPORTANT:");
  console.log(
    "Product images must exist inside client/public/products/"
  );
  console.log("==========================================");
} catch (error) {
  console.error("");
  console.error("Seed failed:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.close();
}