// ============================================================
// FAQ page — full standalone page at /faq
// ============================================================

import type { Metadata } from "next";
import FAQClient from "./FAQClient";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "FAQ — Karman SAT Tutoring",
  description:
    "Answers about Karman SAT practice, current plans, tutors, scheduling, and prospective course-fee protection.",
};

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <FAQClient />
      <Footer />
    </>
  );
}
