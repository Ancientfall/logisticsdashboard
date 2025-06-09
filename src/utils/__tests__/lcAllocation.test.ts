import { parseLCAllocationString } from '../lcAllocation';

describe('LC Allocation Parser Tests', () => {
  // Helper function to format output nicely
  const formatAllocation = (allocations: { lcNumber: string; percentage: number }[]) => {
    return allocations.map(a => ({
      lcNumber: a.lcNumber,
      percentage: `${a.percentage.toFixed(2)}%`
    }));
  };

  describe('User-specified scenarios', () => {
    test('Single LC "9358" - Should allocate 100% to 9358', () => {
      const input = "9358";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}"`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(1);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(100);
    });

    test('Multiple LCs without percentages "9358, 9360, 10139" - Should allocate 33.33% to each', () => {
      const input = "9358, 9360, 10139";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}"`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(3);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBeCloseTo(33.33, 1);
      expect(result[1].lcNumber).toBe('9360');
      expect(result[1].percentage).toBeCloseTo(33.33, 1);
      expect(result[2].lcNumber).toBe('10139');
      expect(result[2].percentage).toBeCloseTo(33.33, 1);
      
      // Verify they sum to 100%
      const total = result.reduce((sum, a) => sum + a.percentage, 0);
      expect(total).toBeCloseTo(100, 1);
    });

    test('Two LCs without percentages "9358, 10123" - Should allocate 50% to each', () => {
      const input = "9358, 10123";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}"`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(2);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(50);
      expect(result[1].lcNumber).toBe('10123');
      expect(result[1].percentage).toBe(50);
    });

    test('LCs with specific percentages "9358 12, 10123 64, 9876 12, 91023 12" - Should use the specific percentages', () => {
      const input = "9358 12, 10123 64, 9876 12, 91023 12";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}"`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(4);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(12);
      expect(result[1].lcNumber).toBe('10123');
      expect(result[1].percentage).toBe(64);
      expect(result[2].lcNumber).toBe('9876');
      expect(result[2].percentage).toBe(12);
      expect(result[3].lcNumber).toBe('91023');
      expect(result[3].percentage).toBe(12);
      
      // Verify they sum to 100%
      const total = result.reduce((sum, a) => sum + a.percentage, 0);
      expect(total).toBe(100);
    });
  });

  describe('Edge cases', () => {
    test('Total percentages not equaling 100% - Should normalize', () => {
      const input = "9358 30, 10123 40, 9876 20";  // Total = 90%
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (Total: 90%)`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(3);
      
      // Should normalize to 100%
      const total = result.reduce((sum, a) => sum + a.percentage, 0);
      expect(total).toBeCloseTo(100, 1);
      
      // Check normalized values
      expect(result[0].percentage).toBeCloseTo(33.33, 1);  // 30/90 * 100
      expect(result[1].percentage).toBeCloseTo(44.44, 1);  // 40/90 * 100
      expect(result[2].percentage).toBeCloseTo(22.22, 1);  // 20/90 * 100
    });

    test('Mixed formats - some with percentages, some without', () => {
      const input = "9358 40, 10123, 9876 30, 91023";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (40% + 30% allocated, 30% remainder for 2 LCs)`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(4);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(40);
      expect(result[1].lcNumber).toBe('10123');
      expect(result[1].percentage).toBe(15);  // 30% remainder / 2
      expect(result[2].lcNumber).toBe('9876');
      expect(result[2].percentage).toBe(30);
      expect(result[3].lcNumber).toBe('91023');
      expect(result[3].percentage).toBe(15);  // 30% remainder / 2
    });

    test('Different delimiters - semicolons', () => {
      const input = "9358; 9360; 10139";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (semicolon delimiter)`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(3);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[1].lcNumber).toBe('9360');
      expect(result[2].lcNumber).toBe('10139');
      
      // Should split equally
      result.forEach(allocation => {
        expect(allocation.percentage).toBeCloseTo(33.33, 1);
      });
    });

    test('Different delimiters - pipes', () => {
      const input = "9358 | 9360 | 10139";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (pipe delimiter)`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(3);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[1].lcNumber).toBe('9360');
      expect(result[2].lcNumber).toBe('10139');
      
      // Should split equally
      result.forEach(allocation => {
        expect(allocation.percentage).toBeCloseTo(33.33, 1);
      });
    });

    test('Mixed delimiters', () => {
      const input = "9358 25; 9360, 10139 | 91023";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (mixed delimiters)`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(4);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(25);
      
      // Remaining 75% split among 3 LCs
      expect(result[1].lcNumber).toBe('9360');
      expect(result[1].percentage).toBe(25);
      expect(result[2].lcNumber).toBe('10139');
      expect(result[2].percentage).toBe(25);
      expect(result[3].lcNumber).toBe('91023');
      expect(result[3].percentage).toBe(25);
    });

    test('Percentages over 100% - Should normalize', () => {
      const input = "9358 60, 10123 80";  // Total = 140%
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (Total: 140%)`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(2);
      
      // Should normalize to 100%
      expect(result[0].percentage).toBeCloseTo(42.86, 1);  // 60/140 * 100
      expect(result[1].percentage).toBeCloseTo(57.14, 1);  // 80/140 * 100
      
      const total = result.reduce((sum, a) => sum + a.percentage, 0);
      expect(total).toBeCloseTo(100, 1);
    });

    test('Empty string - Should return empty array', () => {
      const input = "";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (empty string)`);
      console.log('Output:', result);
      
      expect(result).toHaveLength(0);
    });

    test('Whitespace only - Should return empty array', () => {
      const input = "   ";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (whitespace only)`);
      console.log('Output:', result);
      
      expect(result).toHaveLength(0);
    });

    test('Invalid percentage values', () => {
      const input = "9358 abc, 10123 50";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (invalid percentage "abc")`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(2);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(50);  // Gets remainder
      expect(result[1].lcNumber).toBe('10123');
      expect(result[1].percentage).toBe(50);
    });

    test('Negative percentage values', () => {
      const input = "9358 -20, 10123 50";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (negative percentage)`);
      console.log('Output:', formatAllocation(result));
      
      // Negative percentages are treated as invalid
      expect(result).toHaveLength(2);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(50);  // Gets remainder
      expect(result[1].lcNumber).toBe('10123');
      expect(result[1].percentage).toBe(50);
    });

    test('Percentage > 100', () => {
      const input = "9358 150";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (percentage > 100)`);
      console.log('Output:', formatAllocation(result));
      
      // Values > 100 are treated as invalid
      expect(result).toHaveLength(1);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(100);  // Gets 100% as sole LC
    });

    test('Complex spacing variations', () => {
      const input = "  9358  40  ,   10123   ,  9876   60  ";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (complex spacing)`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(3);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(40);
      expect(result[1].lcNumber).toBe('10123');
      expect(result[1].percentage).toBe(0);  // No remainder left
      expect(result[2].lcNumber).toBe('9876');
      expect(result[2].percentage).toBe(60);
    });
  });

  describe('Real-world scenarios', () => {
    test('Single LC with trailing comma', () => {
      const input = "9358,";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}"`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(1);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(100);
    });

    test('LC with percentage symbol', () => {
      const input = "9358 40%, 10123 60%";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (with % symbols)`);
      console.log('Output:', formatAllocation(result));
      
      // Current implementation doesn't handle % symbol, treats as invalid
      expect(result).toHaveLength(2);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(50);  // Split equally due to invalid percentages
      expect(result[1].lcNumber).toBe('10123');
      expect(result[1].percentage).toBe(50);
    });

    test('Last LC without percentage gets remainder', () => {
      const input = "9358 40, 10123 30, 9876";
      const result = parseLCAllocationString(input);
      
      console.log(`Input: "${input}" (last LC gets remainder)`);
      console.log('Output:', formatAllocation(result));
      
      expect(result).toHaveLength(3);
      expect(result[0].lcNumber).toBe('9358');
      expect(result[0].percentage).toBe(40);
      expect(result[1].lcNumber).toBe('10123');
      expect(result[1].percentage).toBe(30);
      expect(result[2].lcNumber).toBe('9876');
      expect(result[2].percentage).toBe(30);  // Gets the 30% remainder
    });
  });
});