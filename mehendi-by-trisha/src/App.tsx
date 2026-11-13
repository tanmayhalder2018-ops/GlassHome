import { LazyMotion, MotionConfig, domMax } from 'framer-motion'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { ArtistIntroduction } from './components/ArtistIntroduction'
import { Services } from './components/Services'
import { Gallery } from './components/Gallery'
import { BrandStory } from './components/BrandStory'
import { BookingForm } from './components/BookingForm'
import { InstagramSection } from './components/InstagramSection'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { FloatingWhatsApp } from './components/FloatingWhatsApp'
import { Cursor } from './components/Cursor'
import { LightboxProvider } from './components/Lightbox'
import { ServiceAreas } from './components/ServiceAreas'
import { Faq } from './components/Faq'

export default function App() {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <LightboxProvider>
          <a className="skip-link" href="#main">Skip to content</a>
          <Navbar />
          <main id="main">
            <Hero />
            <Marquee />
            <ArtistIntroduction />
            <Services />
            <ServiceAreas />
            <Gallery />
            <BrandStory />
            <BookingForm />
            <Faq />
            <InstagramSection />
            <Contact />
          </main>
          <Footer />
          <FloatingWhatsApp />
          <Cursor />
        </LightboxProvider>
      </MotionConfig>
    </LazyMotion>
  )
}
