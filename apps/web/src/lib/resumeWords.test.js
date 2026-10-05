import { describe, it, expect } from 'vitest';
import { orgKey, titleWords, titleScore } from './resumeWords.js';
import { companyKey } from '@jobdekho/core/company-key.js';

// The web keeps its own copy of core's company key (its bundle cannot
// import core), so an employer that meets itself in the feed's company
// filter meets itself here too.
describe('the web copy of the company key', () => {
  it('reads every name the way core does', () => {
    const names = [
      'Acme Labs', 'ACME LABS PVT. LTD.', 'Acme Labs Private Limited', 'PhonePe Private Limited', 'Razorpaysoftwareprivatelimited',
      'Tata Consultancy Services', 'Infosys Technologies Ltd', 'Cisco', 'Indiaservices', 'stdlib', 'IIT Delhi',
      'Indian Institute of Technology, Delhi', '  ', '', null, undefined, 'Co', 'Self-employed', 'Amazon Web Services (AWS)',
    ];
    for (const name of names) expect([name, orgKey(name)]).toEqual([name, companyKey(name)]);
  });
});

describe('titleWords', () => {
  it('drops case, punctuation and the little words, and trims a plural or an -ing', () => {
    expect(titleWords('Head of Engineering')).toEqual(['head', 'engineer']);
    expect(titleWords('Software Engineering Intern')).toEqual(titleWords('software engineer intern'));
    expect(titleWords('Distributed Systems, Research')).toEqual(['distributed', 'system', 'research']);
  });

  it('spells out the short forms resumes use, degrees included', () => {
    expect(titleWords('Sr. SDE')).toEqual(['senior', 'software', 'development', 'engineer']);
    expect(titleWords('B.Tech in Computer Science')).toEqual(titleWords('Bachelor of Technology, Computer Science'));
    expect(titleScore("Master's in Data Science", 'M.Sc. Data Science')).toBe(1);
    expect(titleWords('Ph.D')).toEqual(['doctor', 'philosophy']);
  });

  // A word every plain object answers to once threw here, so every fill
  // from a resume failed while a title held it.
  it('reads a word named like a property every object has as a word', () => {
    expect(titleWords('SQL Query Constructor')).toEqual(['sql', 'query', 'constructor']);
    expect(titleScore('SQL Query Constructor', 'Portfolio site')).toBe(0);
  });

  it('reads nothing as no words', () => {
    expect(titleWords('')).toEqual([]);
    expect(titleWords(null)).toEqual([]);
    expect(titleWords(' - ')).toEqual([]);
  });
});

describe('titleScore', () => {
  it('is 1 for the same words in any order or spelling', () => {
    expect(titleScore('Full-Stack Developer', 'full stack developer')).toBe(1);
    expect(titleScore('Maap, Quotation Management PWA', 'Maap - Quotation Management PWA')).toBe(1);
    expect(titleScore('SWE Intern', 'Software Engineering Internship')).toBe(1);
  });

  it('is 0.8 for one title inside the other with one word to spare', () => {
    expect(titleScore('Software Engineer', 'Software Engineer II')).toBe(0.8);
    expect(titleScore('Chess Engine in Rust', 'Chess Engine')).toBe(0.8);
  });

  it('is the share of words in common otherwise, so different roles stay apart', () => {
    expect(titleScore('Backend Engineer', 'Frontend Engineer')).toBe(0.5);
    expect(titleScore('Data Analyst Intern', 'Data Science Intern')).toBeCloseTo(2 / 3);
    expect(titleScore('Developer', 'Platform Engineer')).toBe(0);
  });

  it('does not let a one-word title sit inside any longer one as a near match', () => {
    expect(titleScore('Intern', 'Software Intern')).toBeCloseTo(2 / 3);
    expect(titleScore('Maap', 'Maap, Quotation Management PWA')).toBeLessThan(0.6);
  });

  it('is 0 when either side has no title', () => {
    expect(titleScore('', 'Engineer')).toBe(0);
    expect(titleScore('Engineer', undefined)).toBe(0);
  });
});
