'use client'

import Footer from '@/src/components/Footer'
import Layout from '@/src/components/Layout'
import Navbar from '@/src/components/Navbar'
import DepthAnythingDashboardLocal from '@/src/components/dashboard/DepthAnythingDashboardLocal'

export default function DepthAnythingLocalPage() {
  return (
    <Layout>
      <Navbar />
      <main className="pt-20">
        <section className="section">
          <div className="container">
            <DepthAnythingDashboardLocal />
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  )
}
