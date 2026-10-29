require("dotenv").config({ path: "./.env" });

const mongoose = require("mongoose");
const Category = require("../src/models/Category");

// Keep the COMPLETE fixedCategories array from the previous response here.
// Include all your existing categories and all the additional categories.

const fixedCategories = [
  // Existing Categories
  "Accounting & Auditing",
  "Alkaline Health",
  "Ambulance Services",
  "Architecture & Building Design",
  "Artist / Art Works",
  "Automobile & Accessories",
  "Bag & Luggage",
  "Bakery",
  "Battery Shop",
  "Beauty & Cosmetics",
  "Books & Periodicals",
  "Boutique",
  "Building Materials",
  "Business Consulting",
  "Career Guidance & Placement",
  "Carpentry Services",
  "Catering Services",
  "CCTV & Security Systems",
  "Cement & Building Materials",
  "Cleaning Services",
  "Computer & Mobile",
  "Courier Service",
  "Crockery & Glassware",
  "Cycle Shop",
  "Diagnostic Centre",
  "Digital Marketing & SEO",
  "Doctor / Medical Clinic",
  "Driving Schools",
  "Electricals",
  "Electronics",
  "Event Management",
  "Family & Career Counseling",
  "Fancy Store",
  "Fast Food",
  "Fish Market",
  "Flower Shop",
  "Footwear",
  "Furniture",
  "Gardening & Landscaping",
  "Gift Shop",
  "Gold & Diamonds",
  "Graphic Designing",
  "Grocery",
  "Gym & Wellness",
  "Hardware",
  "Home Appliance Repair",
  "Home Appliances",
  "Home Decor",
  "Home Nursing / Caretaking",
  "Hypermarket",
  "Insurance Office",
  "Interior Design Gallery",
  "Jewellery",
  "Juice & Cool Bar",
  "Kitchen Cabinets",
  "Laboratory & Diagnostics",
  "Land Surveying",
  "Landscaping & Nursery",
  "Language Training",
  "Laundry & Dry Cleaning",
  "Leather Goods",
  "Legal Services / Lawyer",
  "Masonry / Construction",
  "Mattress Shop",
  "Meat Store",
  "Medical Clinic",
  "Mental Health Counselling",
  "Mobile App Development",
  "Music & Dance Classes",
  "Musical Instruments",
  "Optical Shop",
  "Painting Services",
  "Packers and Movers",
  "Paints & Hardware",
  "Pest Control",
  "Pet Care & Veterinary Services",
  "Pet Shop",
  "Pharmacy",
  "Pharmacy / Home Delivery",
  "Physiotherapy",
  "Plastic Products",
  "Plumbing",
  "Plumbing & Electrical Services",
  "Plywood & Glass",
  "Printing & Xerox",
  "Real Estate Agency",
  "Restaurant",
  "Sanitaryware",
  "Scrap Dealer",
  "Security Services",
  "Services",
  "Skill Development Centers",
  "Social Media Management",
  "Solar Systems",
  "Spa & Salon",
  "Sports & Fitness",
  "Stage Decoration & Lighting",
  "Stationery",
  "Steel & Iron",
  "Studio & Photography",
  "Supermarket",
  "Tailoring & Fashion Designing",
  "Tailoring Shop",
  "Tax & GST Consultancy",
  "Taxi & Cab Services",
  "Textile",
  "Tiles & Sanitaryware",
  "Toys",
  "Travel Agency",
  "Tuition & Academic Coaching",
  "Tyre Shop",
  "Uniforms",
  "Upholstery & Curtains",
  "Vegetable & Fruits",
  "Vehicle Rentals",
  "Video Editing & Motion Graphics",
  "Waste Management",
  "Water treatment",
  "Watch & Clock Shop",
  "Web Design & Development",
  "Yoga & Fitness Training",

  // Professional & Business Services
  "Advocate & Legal Consultancy",
  "Advertising Agency",
  "Banking & Financial Services",
  "Bookkeeping Services",
  "Company Registration Services",
  "Data Entry Services",
  "Document Attestation Services",
  "Export & Import Services",
  "HR & Recruitment Services",
  "IT Consulting Services",
  "Manpower Consultancy",
  "Market Research Services",
  "Office Equipment & Supplies",
  "Office Interior Services",
  "Payroll Services",
  "Professional Consultancy",
  "Project Management Consultancy",
  "Public Relations Agency",
  "Translation & Interpretation Services",
  "Typing & Documentation Services",
  "Virtual Assistant Services",
  "Visa & Immigration Consultancy",

  // Home Maintenance & Repair
  "AC Installation & Repair",
  "Aluminium Fabrication",
  "Appliance Installation",
  "Bathroom Renovation",
  "Car Washing & Detailing",
  "Ceiling Installation",
  "Door & Window Installation",
  "Electrician Services",
  "Elevator & Lift Services",
  "Flooring Services",
  "Glass Installation & Repair",
  "Home Automation",
  "Home Inspection Services",
  "Home Renovation",
  "House Shifting Services",
  "Locksmith Services",
  "Roofing Services",
  "Swimming Pool Construction & Maintenance",
  "Waterproofing Services",
  "Window Cleaning",
  "Carpet Cleaning",
  "Commercial Cleaning",
  "Disinfection Services",
  "Drain Cleaning",
  "House Cleaning",
  "Kitchen Deep Cleaning",
  "Office Cleaning",
  "Office Maintenance",
  "Septic Tank Cleaning",
  "Sofa & Upholstery Cleaning",
  "Water Tank Cleaning",

  // Automotive & Transportation
  "Auto Electrical Services",
  "Automobile Body Shop",
  "Automobile Spare Parts",
  "Bike Repair & Service",
  "Car Accessories",
  "Car Inspection Services",
  "Car Rental",
  "Car Service Centre",
  "Commercial Vehicle Services",
  "Driving Instructor",
  "EV Charging Stations",
  "Heavy Vehicle Repair",
  "Motorcycle Dealership",
  "Vehicle Insurance",
  "Vehicle Registration Services",
  "Vehicle Towing & Recovery",
  "Wheel Alignment & Balancing",
  "Automobile Detailing",
  "EV Repair & Maintenance",

  // IT & Technology
  "AI & Automation Services",
  "API Development",
  "Cloud Computing Services",
  "Cybersecurity Services",
  "Data Analytics Services",
  "Database Management Services",
  "Domain & Hosting Services",
  "E-commerce Development",
  "ERP & CRM Solutions",
  "Game Development",
  "IT Hardware Repair",
  "IT Support Services",
  "Network Installation & Maintenance",
  "Payment Gateway Integration",
  "Software Development",
  "Software Testing & QA",
  "UI/UX Design",
  "Website Maintenance",
  "Website Hosting",
  "WordPress Development",
  "Computer Networking",
  "Mobile Phone Repair",
  "Computer Repair",
  "IT Training Services",

  // Healthcare & Medical
  "Ambulance Equipment & Supplies",
  "Blood Bank",
  "Dental Clinic",
  "Dental Laboratory",
  "Dermatology Clinic",
  "Diabetes Care Centre",
  "Eye Hospital",
  "Fertility Clinic",
  "First Aid Training",
  "Home Healthcare Services",
  "Home Sample Collection",
  "Medical Equipment & Supplies",
  "Medical Insurance Services",
  "Medical Tourism",
  "Nutritionist & Dietitian",
  "Occupational Therapy",
  "Orthopaedic Clinic",
  "Pathology Laboratory",
  "Radiology & Imaging Centre",
  "Rehabilitation Centre",
  "Speech Therapy",
  "Specialist Hospital",
  "Blood Testing Services",
  "Cardiology Clinic",
  "Child Specialist Clinic",
  "Dental Care Services",
  "ENT Clinic",
  "Eye Care Centre",
  "General Hospital",
  "Home Physiotherapy",
  "Medical Equipment Rental",
  "Nursing Services",
  "Orthodontic Clinic",
  "Palliative Care Services",
  "Psychology Services",
  "Vaccination Centre",
  "Women Healthcare Services",

  // Education & Training
  "Abacus & Mental Maths Classes",
  "Art & Craft Classes",
  "Computer Training Institute",
  "Cooking Classes",
  "Corporate Training",
  "Digital Marketing Training",
  "Early Childhood Education",
  "Educational Consultancy",
  "Exam Preparation Centre",
  "Foreign Language Institute",
  "IELTS & OET Coaching",
  "Industrial Training Institute",
  "Online Education",
  "Personality Development Classes",
  "Professional Certification Training",
  "Robotics & STEM Classes",
  "Study Abroad Consultancy",
  "Teacher Training",
  "Vocational Training",
  "Writing & Communication Training",
  "Abroad Education Consultancy",
  "Dance Academy",
  "Driving Licence Training",
  "Entrance Coaching Centre",
  "Montessori School",
  "Preschool",
  "School",
  "College",
  "University",
  "Online Tutoring",
  "Competitive Exam Coaching",
  "Swimming Classes",
  "Martial Arts Classes",
  "Self Defence Training",
  "First Aid Training Centre",

  // Finance & Insurance
  "Accounting Software Services",
  "Business Loan Consultancy",
  "Chartered Accountant",
  "Credit Consultancy",
  "Financial Advisory Services",
  "Financial Planning",
  "GST Registration Services",
  "Income Tax Filing Services",
  "Investment Consultancy",
  "Loan Agency",
  "Microfinance Services",
  "Mutual Fund Distributor",
  "Personal Loan Services",
  "Stock Broking Services",
  "Vehicle Loan Services",
  "Insurance Consultancy",
  "Life Insurance",
  "Health Insurance",
  "General Insurance",
  "Money Transfer Services",
  "Foreign Exchange Services",

  // Fashion & Personal Services
  "Bridal Makeup Artist",
  "Costume Rental",
  "Fashion Boutique",
  "Fashion Photography",
  "Henna / Mehndi Artist",
  "Image Consulting",
  "Makeup Academy",
  "Personal Grooming Services",
  "Personal Stylist",
  "Readymade Garments",
  "Skin Care Clinic",
  "Tattoo Studio",
  "Wedding Dress Rental",
  "Wedding Planning Services",
  "Beauty Parlour",
  "Barber Shop",
  "Hair Styling Services",
  "Hair Treatment Centre",
  "Nail Art Studio",
  "Permanent Makeup Services",
  "Piercing Studio",
  "Spa & Massage Services",
  "Bridal Wear Shop",

  // Events & Entertainment
  "Audio & Sound System Rental",
  "Birthday Party Organizers",
  "Bridal Boutique",
  "DJ Services",
  "Event Equipment Rental",
  "Fireworks Display Services",
  "Invitation Card Design",
  "Live Music & Entertainment",
  "LED Screen Rental",
  "Magic Show & Performers",
  "Marriage Bureau",
  "Stage & Truss Rental",
  "Wedding Catering",
  "Wedding Photography",
  "Wedding Videography",
  "Balloon Decoration",
  "Corporate Event Management",
  "Exhibition Organizers",
  "Event Photography",
  "Event Videography",
  "Flower Decoration",
  "Party Hall",
  "Wedding Hall",
  "Wedding Invitation Printing",

  // Industrial & Manufacturing
  "Agricultural Equipment",
  "Chemical Trading",
  "Commercial Kitchen Equipment",
  "Factory Automation",
  "Industrial Electrical Services",
  "Industrial Equipment Rental",
  "Industrial Machinery",
  "Industrial Safety Equipment",
  "Machine Repair & Maintenance",
  "Manufacturing Unit",
  "Packaging Materials",
  "Plastic Manufacturing",
  "Precision Engineering",
  "Production Equipment",
  "Raw Material Suppliers",
  "Sheet Metal Fabrication",
  "Tool & Die Manufacturing",
  "Welding & Fabrication",
  "CNC Machining",
  "Industrial Automation",
  "Industrial Gas Suppliers",
  "Machine Tools",
  "Metal Fabrication",
  "Rubber Products Manufacturing",
  "Textile Manufacturing",

  // Agriculture & Farming
  "Agricultural Consultancy",
  "Agricultural Equipment Rental",
  "Aquaculture & Fish Farming",
  "Farm Equipment Repair",
  "Farm Machinery Dealers",
  "Fertilizer & Pesticide Shop",
  "Fisheries Services",
  "Food Processing Unit",
  "Livestock Farming",
  "Organic Farming",
  "Poultry Farm",
  "Seed Shop",
  "Soil Testing Services",
  "Tractor Rental",
  "Veterinary Pharmacy",
  "Dairy Farm",
  "Dairy Products Shop",
  "Animal Feed Shop",
  "Beekeeping",
  "Flower Farming",
  "Fruit Farming",
  "Mushroom Farming",
  "Plant Nursery",
  "Poultry Equipment",
  "Rice Mill",
  "Spice Farming",
  "Tractor Dealership",

  // Wholesale & Distribution
  "Building Materials Wholesale",
  "Clothing Wholesale",
  "Consumer Goods Distributor",
  "Electrical Goods Wholesale",
  "Electronics Wholesale",
  "Food & Beverage Distributor",
  "FMCG Distributor",
  "Import & Export Trading",
  "Industrial Supplies",
  "Jewellery Wholesale",
  "Medical Supplies Distributor",
  "Mobile Phone Wholesale",
  "Paper & Packaging Wholesale",
  "Pharmaceutical Distributor",
  "Restaurant Supplies",
  "Textile Wholesale",
  "Automobile Parts Wholesale",
  "Chemical Distributor",
  "Computer Wholesale",
  "Construction Materials Supplier",
  "Hardware Wholesale",
  "Plastic Products Wholesale",
  "Stationery Wholesale",

  // Food & Hospitality
  "Banquet Hall",
  "Bed & Breakfast",
  "Boarding House",
  "Cafe",
  "Cloud Kitchen",
  "Food Delivery Services",
  "Guest House",
  "Hostel",
  "Hotel",
  "Ice Cream Shop",
  "Mess & Catering",
  "Resort",
  "Serviced Apartments",
  "Snack Shop",
  "Takeaway Restaurant",
  "Tea Shop",
  "Canteen Services",
  "Food Truck",
  "Food Manufacturing",
  "Fresh Juice Shop",
  "Home Bakery",
  "Home Food Delivery",
  "Ice Cream Parlour",
  "Juice Manufacturing",
  "Organic Food Store",
  "Seafood Restaurant",
  "Sweet Shop",
  "Traditional Food Shop",
  "Vegetarian Restaurant",
  "Non-Vegetarian Restaurant",

  // Pet & Animal Services
  "Animal Boarding",
  "Animal Feed Shop",
  "Dog Training",
  "Pet Grooming",
  "Pet Hotel",
  "Pet Photography",
  "Pet Training Centre",
  "Pet Transportation",
  "Veterinary Clinic",
  "Veterinary Hospital",
  "Animal Rescue Services",
  "Aquarium Shop",
  "Bird Shop",
  "Pet Adoption Centre",
  "Pet Food Shop",
  "Pet Sitting Services",
  "Veterinary Laboratory",

  // Property & Real Estate
  "Building Contractors",
  "Commercial Property Rental",
  "Construction Consultancy",
  "Facility Management",
  "Home Rental Agency",
  "Land Brokerage",
  "Property Appraisal",
  "Property Documentation Services",
  "Property Management",
  "Property Valuation",
  "Real Estate Developers",
  "Rental Property Management",
  "Residential Property Sales",
  "Structural Engineering",
  "Building Inspection",
  "Civil Engineering Consultancy",
  "Commercial Property Sales",
  "Land Development",
  "Property Maintenance",
  "Real Estate Investment",
  "Residential Property Rental",
  "Structural Design Services",

  // Logistics & Delivery
  "Cold Storage Services",
  "Commercial Transport",
  "Distribution & Logistics",
  "Document Delivery",
  "Express Delivery",
  "Freight Forwarding",
  "Goods Transport",
  "Last Mile Delivery",
  "Local Delivery Services",
  "Logistics Consultancy",
  "Mini Truck Rental",
  "Storage & Warehousing",
  "Supply Chain Management",
  "Transport Contractors",
  "Bike Courier Services",
  "Container Transport",
  "International Courier",
  "Lorry Transport",
  "Refrigerated Transport",
  "Warehouse Rental",

  // Media & Creative Services
  "3D Modelling & Rendering",
  "Animation Studio",
  "Audio Recording Studio",
  "Content Creation",
  "Copywriting Services",
  "Digital Illustration",
  "Drone Photography",
  "Film Production",
  "Influencer Marketing",
  "Podcast Production",
  "Product Photography",
  "Resume Writing Services",
  "Subtitle & Caption Services",
  "Voice Over Services",
  "Video Production",
  "Book Publishing",
  "Digital Printing",
  "Media Production",
  "Music Production",
  "Newspaper Agency",
  "Printing Press",
  "Professional Writing Services",
  "Signboard Design & Printing",
  "Translation Services",

  // Family, Children & Senior Care
  "Baby Care Services",
  "Babysitting Services",
  "Child Development Centre",
  "Childcare Centre",
  "Daycare Centre",
  "Elderly Care Services",
  "Home Tutor",
  "Kids Activity Centre",
  "Special Needs Education",
  "Special Needs Support Services",
  "Caregiver Services",
  "Child Psychology Services",
  "Home Companion Services",
  "Senior Citizen Care Centre",

  // Energy & Environment
  "Battery Recycling",
  "Biogas Installation",
  "Energy Audit Services",
  "Environmental Consultancy",
  "EV Battery Services",
  "Rainwater Harvesting",
  "Renewable Energy Consultancy",
  "Solar Panel Cleaning",
  "Solar Panel Installation",
  "Solar Panel Repair",
  "Water Purifier Installation & Repair",
  "Water Tanker Services",
  "Water Testing Laboratory",
  "Wind Energy Services",
  "E-Waste Recycling",
  "Electronic Waste Collection",
  "Environmental Testing",
  "Recycling Centre",
  "Waste Collection Services",
  "Water Treatment Plant",
  "Sewage Treatment Services",

  // Additional Retail Shops
  "Agricultural Products Shop",
  "Baby Products Store",
  "Computer Accessories Shop",
  "Disposable Products Shop",
  "Electrical Accessories Shop",
  "Fitness Equipment Shop",
  "Handicrafts Shop",
  "Home Furnishing Shop",
  "Medical Supplies Shop",
  "Mobile Accessories Shop",
  "Packaging Materials Shop",
  "Party Supplies Shop",
  "Religious Items Shop",
  "Safety Equipment Shop",
  "Second-Hand Goods Shop",
  "Sports Equipment Shop",
  "Travel Accessories Shop",
  "Used Furniture Shop",
  "Antique Shop",
  "Art Supplies Shop",
  "Baby Clothing Shop",
  "Carpet Shop",
  "Computer Shop",
  "Cosmetics Shop",
  "Electrical Appliance Shop",
  "Fire Safety Equipment Shop",
  "Hardware Tools Shop",
  "Home Lighting Shop",
  "Kitchenware Shop",
  "Musical Instruments Shop",
  "Perfume Shop",
  "Sewing Machine Shop",
  "Second-Hand Mobile Shop",
  "Second-Hand Vehicle Dealer",
  "Watch Repair Shop",
  "Water Purifier Shop",

  // Individual Local Service Providers
  "AC Technician",
  "Appliance Repair Technician",
  "Car Mechanic",
  "Cook / Private Chef",
  "Gardener",
  "Home Cleaning Professional",
  "Home Painter",
  "Housekeeper",
  "Ironing Services",
  "Local Plumber",
  "Mobile Repair Technician",
  "Personal Driver",
  "Private Security Guard",
  "Refrigerator Repair",
  "TV Repair Technician",
  "Washing Machine Repair",
  "Water Purifier Technician",
  "Home Maintenance Services",
  "Home Organizing Services",
  "Home Visit Beauty Services",
  "In-Home Cooking Services",
  "Pest Inspection Services",
  "Sewing & Alteration Services",

  // Kerala-Specific Businesses
  "Akshaya Centre",
  "Areca Nut Trading",
  "Banana Chips & Snacks",
  "Coir Products",
  "Coconut Products",
  "Driving Licence Consultancy",
  "Gold Loan Services",
  "Houseboat Services",
  "Kerala Traditional Food",
  "Malabar Catering",
  "Passport & Visa Services",
  "Remittance Services",
  "Rubber Trading",
  "Seafood Export",
  "Spice Trading",
  "Travel & Pilgrimage Services",
  "Ayurvedic Clinic",
  "Ayurvedic Products Shop",
  "Coir Manufacturing",
  "Coconut Oil Mill",
  "Fish Export",
  "Kalaripayattu Training",
  "Kerala Saree Shop",
  "Kudumbashree Products",
  "Matrimony Services",
  "NRI Services",
  "Traditional Jewellery",
  "Traditional Wedding Services",
  "Houseboat Rental",
  "Tourist Taxi Services",

  // Other Frequently Needed Services
  "Astrology Services",
  "Career Coaching",
  "Courier Franchise",
  "Detective Agency",
  "Domestic Help Services",
  "Fingerprinting Services",
  "Funeral Services",
  "Genealogy Services",
  "Laundry Pickup & Delivery",
  "Lost & Found Services",
  "Marriage Counselling",
  "Meditation Centre",
  "Notary Services",
  "Personal Shopping Services",
  "Relocation Consultancy",
  "Religious Services",
  "Research Services",
  "Self Storage Services",
  "Sign Language Interpretation",
  "Surveying Services",
  "Travel Documentation Services",
  "Typing Centre",
  "Water Delivery Services",
  "Wellness Coaching",
  "Yoga Instructor",
  "Astrology Consultation",
  "Home Inspection & Valuation",
  "Legal Documentation Services",
  "Public Notary Services",
  "Recruitment Agency",
  "Security Guard Agency",
  "Temporary Staffing Services",
  "Waste Disposal Services",
  "Watch Repair Services",
  "Welfare & Community Services",
];
async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from your .env file");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const uniqueCategories = [
      ...new Set(fixedCategories.map((name) => name.trim()).filter(Boolean)),
    ];

    let insertedCount = 0;
    let existingCount = 0;

    for (const name of uniqueCategories) {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Avoid duplicates by category name or slug.
      const exists = await Category.findOne({
        $or: [{ name }, { slug }],
      }).lean();

      if (exists) {
        existingCount++;
        continue;
      }

      await Category.create({
        name,
        slug,
        isFixed: true,
      });

      insertedCount++;
    }

    console.log("\n========== CATEGORY SEEDING COMPLETE ==========");
    console.log(`Categories in seed list: ${uniqueCategories.length}`);
    console.log(`New categories inserted: ${insertedCount}`);
    console.log(`Existing categories skipped: ${existingCount}`);
    console.log("================================================");
  } catch (error) {
    console.error("Category seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}


async function seed() {
  let connected = false;

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from your .env file");
    }

    await mongoose.connect(process.env.MONGO_URI);
    connected = true;

    console.log("Connected to MongoDB");

    const uniqueCategories = [
      ...new Set(
        fixedCategories
          .map((name) => name.trim())
          .filter(Boolean)
      ),
    ];

    let insertedCount = 0;
    let existingCount = 0;
    let duplicateCount = 0;

    for (const name of uniqueCategories) {
      const id = name
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      try {
        // Skip categories that already exist by ID or name.
        const exists = await Category.findOne({
          $or: [{ id }, { name }],
        }).lean();

        if (exists) {
          existingCount++;
          continue;
        }

        await Category.create({
          id,
          name,
          isFixed: true,
        });

        insertedCount++;
      } catch (error) {
        // Handle duplicate IDs caused by existing records or concurrent inserts.
        if (error.code === 11000) {
          duplicateCount++;
          console.warn(`Skipped duplicate category: ${name}`);
          continue;
        }

        throw error;
      }
    }

    console.log("\n========== CATEGORY SEEDING COMPLETE ==========");
    console.log(`Categories in seed list: ${uniqueCategories.length}`);
    console.log(`New categories inserted: ${insertedCount}`);
    console.log(`Existing categories skipped: ${existingCount}`);
    console.log(`Duplicate-key errors skipped: ${duplicateCount}`);
    console.log("================================================");
  } catch (error) {
    console.error("Category seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connected) {
      await mongoose.disconnect();
      console.log("MongoDB connection closed");
    }
  }
}

seed();
