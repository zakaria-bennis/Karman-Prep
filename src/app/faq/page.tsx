// ============================================================
// FAQ page — full standalone page at /faq
// ============================================================

import type { Metadata } from "next";
import FAQClient from "./FAQClient";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "FAQ — Karman SAT Tutoring",
  description: "Answers to the most common questions about Karman SAT tutoring, pricing, tutors, scheduling, and the score improvement guarantee.",
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
