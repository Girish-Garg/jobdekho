import { describe, it, expect } from 'vitest'
import { optionalLine } from '@jobdekho/core/jd-optional.js'

describe('optionalLine', () => {
  it('reads a line opened by a cue as optional', () => {
    for (const line of ['Preferred: 5 years of Go', 'Bonus points if you know Svelte.', 'Nice to have: Rust', 'Good to have: AWS certification', 'Plus: Terraform', 'Preferably, experience with JUnit.', 'Desirable: Kafka']) {
      expect(optionalLine(line)).toBe(true)
    }
  })

  it('reads a line closed by a cue as optional', () => {
    for (const line of ['Experience with Kafka is a plus', 'Knowledge of Lua would be a plus.', 'An MBA is preferred.', 'Advanced degree preferred', 'AWS certification is good to have', 'Exposure to Angular, JavaScript, or other front-end technologies is a plus.', 'Experience in Tableau and COGNOS reporting preferred but not required.', 'Pharma domain (good to have)', '(SAFe is a plus)']) {
      expect(optionalLine(line)).toBe(true)
    }
  })

  it('reads "is an advantage", "desired" and "is beneficial" as closing cues too', () => {
    for (const line of ['Exposure to cloud platforms (Azure/AWS) is an advantage.', 'Experience with ERPs such as SAP, Oracle, etc. desired', 'Basic knowledge of SQL is beneficial.', 'Experience with Perl or Tcl would be good.']) {
      expect(optionalLine(line)).toBe(true)
    }
    expect(optionalLine('Customize dashboards as desired')).toBe(false)
    expect(optionalLine('Operating Systems: Linux experience; Windows Server is beneficial.')).toBe(false)
  })

  // The owner's pre-check of the section model found these must-haves
  // moved to nice by a cue that qualified only part of the line.
  it('leaves a must-have with an optional part where it is', () => {
    for (const line of [
      'Bachelor’s degree in Engineering, Computer Science, Supply Chain, or related field (Master’s preferred).',
      'Experience in handling realtime streamingtransactional data preferably SparkStreaming Kafka Event Hubs Event Grid Stream Analytics Service Bus etc',
      'Bachelor’s degree in Computer Science or related field; advanced degree preferred.',
      'Bachelor\'s degree required (Master\'s preferred)',
      '3 years of Java, preferably Spring',
      'Bachelors/University degree, Master’s degree preferred',
      'Deep Linux knowledge; working knowledge of Windows is a plus',
      'ERP knowledge is essential and with SAP would be an added advantage.',
      'Proficiency with Linux device drivers, System bring up, and Linux kernel, Prior experience in working with large code-bases preferred.',
    ]) {
      expect(optionalLine(line)).toBe(false)
    }
  })

  it('is not fooled by the cue words in company copy, pay or a denial', () => {
    expect(optionalLine('NVIDIA is widely considered to be one of the technology world’s most desirable employers.')).toBe(false)
    expect(optionalLine('Competitive salary and a performance bonus')).toBe(false)
    expect(optionalLine('This role is AI-first, and we mean it as a requirement, not a bonus.')).toBe(false)
  })
})
