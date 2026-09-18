import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import ContactActions from '../components/ContactActions';
import Seo from '../components/Seo';

const contactSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact CrusherBook',
  url: 'https://crusherbook.com/contact',
  description: 'Contact CrusherBook for stone crusher plant ERP software, pricing, weighbridge workflow, and product demo.',
};

const Contact = () => {
  return (
    <div className="w-full bg-white">
      <Seo
        title="Contact CrusherBook - Crusher ERP Support & Demo"
        description="Contact CrusherBook for crusher ERP software demo, pricing, support, weighbridge workflow, and implementation. Get in touch with our team today!"
        path="/contact"
        keywords={[
          'contact crusher software company',
          'crusher ERP software demo',
          'crushbook contact',
          'crusher plant management support',
          'weighbridge software support India',
          'crusher ERP implementation help',
          'crusher software customer support',
        ]}
        schema={contactSchema}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-navy pt-10 pb-8 sm:pt-16 sm:pb-10 lg:pt-20 lg:pb-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,86,8,0.18),transparent),radial-gradient(circle_at_90%_60%,rgba(17,76,171,0.25),transparent_40%)]"
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-5 lg:px-6 xl:max-w-6xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-brand-accent backdrop-blur-sm"
          >
            <span className="flex h-1.5 w-1.5 rounded-full bg-brand-orange animate-pulse"></span>
            <span className="text-[0.65rem] font-medium tracking-wide text-brand-accent/90 sm:text-xs">
              We Reply Fast
            </span>
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-2 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl lg:text-[1.75rem]"
          >
            Contact CrusherBook - ERP Support & Demo
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mx-auto max-w-md text-xs leading-relaxed text-white/70 sm:text-sm"
          >
            Have a question about CrusherBook or need help setting it up? Our team is ready to assist you.
          </motion.p>
          <div className="mt-5">
            <ContactActions compact primaryLabel="Chat on WhatsApp" secondaryLabel="Call Now" />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 py-8 sm:py-10 lg:py-12 bg-gray-50">
        <div className="w-full max-w-5xl mx-auto px-0 sm:px-5 lg:px-6 xl:max-w-6xl">
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">

            {/* Contact Info Cards */}
            <div className="space-y-4 sm:space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-brand-orange/10 rounded-lg flex items-center justify-center shrink-0">
                  <Phone className="text-brand-orange w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-brand-navy mb-1">Call Us</h3>
                  <p className="text-xs sm:text-sm text-brand-slate">Mon – Sat: 9:00 AM to 6:00 PM</p>
                  <div className="flex flex-col gap-0.5 mt-2 text-xs sm:text-sm">
                    <a href="tel:+916264682508" className="font-semibold text-brand-orange hover:underline">+91 6264682508</a>
                    <a href="tel:+919202469725" className="font-semibold text-brand-orange hover:underline">+91 9202469725</a>
                  </div>
                  <a
                    href="https://wa.me/916264682508?text=Hello%20Crusherbook%2C%20I%20want%20to%20know%20about%20pricing%20and%20demo."
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center rounded-full bg-green-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                  >
                    WhatsApp Now
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-brand-accent/15 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="text-brand-navy w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-brand-navy mb-1">Email Us</h3>
                  <p className="text-xs sm:text-sm text-brand-slate mb-2">We reply within 24 hours.</p>
                  <a href="mailto:softwarebytesindia@gmail.com" className="text-xs sm:text-sm font-semibold text-brand-orange hover:underline break-all">
                    softwarebytesindia@gmail.com
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.16 }}
                className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="text-gray-500 w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-brand-navy mb-1">Office</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-brand-slate">
                    Shankar Nagar, Raipur<br />
                    Chhattisgarh, India<br />
                    <span className="text-brand-slate/70">(A SoftwareBytes Product)</span>
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm"
            >
              <h3 className="text-base sm:text-lg font-bold text-brand-navy mb-2">Talk to Sales Fast</h3>
              <p className="text-xs sm:text-sm leading-relaxed text-brand-slate">
                For pricing, software demo, or weighbridge connection discussion, use WhatsApp or call directly for a faster response.
              </p>
              <div className="mt-5 space-y-2.5">
                <a
                  href="https://wa.me/916264682508?text=Hello%20Crusherbook%2C%20I%20want%20a%20demo%20for%20the%20software."
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-green-700"
                >
                  <span>WhatsApp For Demo</span>
                  <Send size={16} />
                </a>
                <a
                  href="tel:+916264682508"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-orange bg-orange-50 px-4 py-3 text-sm font-bold text-brand-orange transition hover:-translate-y-0.5 hover:bg-orange-100"
                >
                  <Phone size={16} />
                  <span>Call +91 6264682508</span>
                </a>
                <a
                  href="mailto:softwarebytesindia@gmail.com"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-brand-navy transition hover:-translate-y-0.5 hover:bg-gray-50"
                >
                  <Mail size={16} />
                  <span>Email Us</span>
                </a>
              </div>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
